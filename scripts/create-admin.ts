import 'dotenv/config';
import { db } from '../lib/db';
import { users } from '../db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || process.argv[2];
    const password = process.env.ADMIN_PASSWORD || process.argv[3];
    const fullname = process.env.ADMIN_NAME || process.argv[4] || 'Admin User';

    if (!email || !password) {
      console.error('❌ Error: Admin email and password are required.');
      console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [fullname]');
      console.error('Or set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME environment variables.');
      process.exit(1);
    }

    // Check if admin already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('❌ Admin user already exists with this email');
      process.exit(1);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const [admin] = await db
      .insert(users)
      .values({
        fullname,
        email,
        password: hashedPassword,
        role: 'admin',
        credits: 10000, // Give admin 10000 credits
        emailVerified: new Date(), // Mark email as verified
      })
      .returning();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('👤 ID:', admin.id);
    console.log('💳 Credits:', admin.credits);
    console.log('✓ Email verified');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
