import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import * as jose from 'jose';
import { eq, sql } from 'drizzle-orm';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const { payload } = await jose.jwtVerify(token, secret);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId as number))
      .limit(1);

    if (user && user.role === 'admin') {
      return user;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// POST - Update user credits
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, operation } = body;

    if (amount === undefined || !operation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedAmount = parseInt(amount);

    if (isNaN(parsedAmount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    let updatedUser;

    if (operation === 'add') {
      // Add credits to existing balance
      [updatedUser] = await db
        .update(users)
        .set({
          credits: sql`${users.credits} + ${parsedAmount}`,
        })
        .where(eq(users.id, parseInt(id)))
        .returning();
    } else if (operation === 'set') {
      // Set credits to specific amount
      [updatedUser] = await db
        .update(users)
        .set({
          credits: parsedAmount,
        })
        .where(eq(users.id, parseInt(id)))
        .returning();
    } else {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        credits: updatedUser.credits,
      },
    });
  } catch (error) {
    console.error('Error updating user credits:', error);
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
  }
}
