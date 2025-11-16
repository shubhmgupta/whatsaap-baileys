import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
            return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 });
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
        
        // Delete any existing reset tokens for this user
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
        
        // Create new reset token
        await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

        await sendPasswordResetEmail(email, token, user.fullname);

        return NextResponse.json({ message: 'Password reset link has been sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Failed to process request. Please try again.' }, { status: 500 });
    }
}
