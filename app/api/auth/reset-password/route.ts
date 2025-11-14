import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();
        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        const resetToken = await db.query.passwordResetTokens.findFirst({ where: eq(passwordResetTokens.token, token) });
        if (!resetToken || !resetToken.expiresAt || !resetToken.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        if (new Date() > resetToken.expiresAt) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, resetToken.userId));
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 });
    }
}
