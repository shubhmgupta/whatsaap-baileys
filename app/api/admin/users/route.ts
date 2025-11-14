import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Admin protected
export async function PUT(request: Request) {
    const { userId, planId, paymentGatewayEnabled } = await request.json();
    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await db.update(users).set({ planId, paymentGatewayEnabled }).where(eq(users.id, userId));

    return NextResponse.json({ message: 'User updated successfully' });
}
