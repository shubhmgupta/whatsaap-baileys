import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments, users, plans } from '@/db/schema';
import { eq } from 'drizzle-orm';

// This would be hit by a payment gateway webhook or called after a manual payment
export async function POST(request: Request) {
    const { userId, planId } = await request.json();
    if (!userId || !planId) {
        return NextResponse.json({ error: 'User ID and Plan ID are required' }, { status: 400 });
    }

    const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
    if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.insert(payments).values({ userId, planId, amount: plan.price, status: 'completed' });
    const currentCredits = user.credits ?? 0;
    await db.update(users).set({ credits: currentCredits + plan.credits }).where(eq(users.id, userId));

    return NextResponse.json({ message: 'Payment successful and credits added' });
}
