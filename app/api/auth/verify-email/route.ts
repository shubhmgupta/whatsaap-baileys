import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const verificationToken = await db.query.verificationTokens.findFirst({ where: eq(verificationTokens.token, token) });
        if (!verificationToken || !verificationToken.expiresAt || !verificationToken.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        if (new Date() > verificationToken.expiresAt) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, verificationToken.userId));
        await db.delete(verificationTokens).where(eq(verificationTokens.id, verificationToken.id));

        return NextResponse.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json({ error: 'Failed to verify email. Please try again.' }, { status: 500 });
    }
}
