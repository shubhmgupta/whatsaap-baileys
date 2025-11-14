import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// This should be a protected route, only accessible by admins
export async function POST(request: Request) {
  const { userId, credits } = await request.json();
  if (!userId || credits === undefined) {
    return NextResponse.json({ error: 'User ID and credits are required' }, { status: 400 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await db.update(users).set({ credits: user.credits + credits }).where(eq(users.id, userId));

  return NextResponse.json({ message: 'Credits assigned successfully' });
}
