import 'dotenv/config';
import { db } from '../lib/db';
import { users } from '../db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  try {
    const email = 'admin@subham.rf.gd';
    const password = '@Shubham123';
    const fullname = 'Admin User';

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
    console.log('🔑 Password: @Shubham123');
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
