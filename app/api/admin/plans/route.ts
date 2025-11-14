import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plans } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Admin protected
export async function POST(request: Request) {
  const { name, price, credits } = await request.json();
  if (!name || !price || !credits) {
    return NextResponse.json({ error: 'Name, price and credits are required' }, { status: 400 });
  }

  await db.insert(plans).values({ name, price, credits });

  return NextResponse.json({ message: 'Plan created successfully' });
}

// Admin protected
export async function PUT(request: Request) {
    const { id, name, price, credits, active } = await request.json();
    if (!id) {
        return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    await db.update(plans).set({ name, price, credits, active }).where(eq(plans.id, id));

    return NextResponse.json({ message: 'Plan updated successfully' });
}
