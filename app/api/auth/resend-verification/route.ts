import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
        }

        // Delete any existing verification tokens for this user
        await db.delete(verificationTokens).where(eq(verificationTokens.userId, user.id));

        // Create new verification token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
        await db.insert(verificationTokens).values({ userId: user.id, token, expiresAt });

        await sendVerificationEmail(email, token);

        return NextResponse.json({ message: 'Verification email sent successfully. Please check your email or console.' });
    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json({ error: 'Failed to resend verification email. Please try again.' }, { status: 500 });
    }
}
