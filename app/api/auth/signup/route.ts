import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request: Request) {
    try {
        const { fullname, email, password, phoneNumber } = await request.json();
        if (!fullname || !email || !password || !phoneNumber) {
            return NextResponse.json({ error: 'Full name, email, password and phone number are required' }, { status: 400 });
        }

        const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [newUser] = await db.insert(users).values({ 
            fullname, 
            email, 
            password: hashedPassword, 
            phoneNumber,
            credits: 10 // Give 10 free credits to new users
        }).returning();

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
        await db.insert(verificationTokens).values({ userId: newUser.id, token, expiresAt });

        await sendVerificationEmail(email, token);

        return NextResponse.json({ message: 'User created successfully. Please verify your email.' });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Failed to create user. Please try again.' }, { status: 500 });
    }
}
