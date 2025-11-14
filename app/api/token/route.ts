import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, apiTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Get all tokens for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const tokens = await db.query.apiTokens.findMany({
      where: eq(apiTokens.userId, parseInt(userId)),
    });

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json({ error: 'Failed to get tokens' }, { status: 500 });
  }
}

// Create new token
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = randomBytes(32).toString('hex');
    const [newToken] = await db.insert(apiTokens).values({ userId, token }).returning();

    return NextResponse.json({ token: newToken });
  } catch (error) {
    console.error('Create token error:', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
