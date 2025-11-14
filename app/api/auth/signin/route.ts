import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (!user.emailVerified) {
            return NextResponse.json({ error: 'Please verify your email before signing in.' }, { status: 403 });
        }

        // Return user data (exclude password)
        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ 
            message: 'Signed in successfully',
            user: userWithoutPassword 
        });
    } catch (error) {
        console.error('Signin error:', error);
        return NextResponse.json({ error: 'Failed to sign in. Please try again.' }, { status: 500 });
    }
}
