import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();
    
    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 });
    }

    let user;
    if (userId) {
      user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    } else if (email) {
      user = await db.query.users.findFirst({ where: eq(users.email, email) });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use user ID as session identifier
    const session = await getSession(user.id.toString());

    if (!session.qr) {
      return NextResponse.json({ error: 'Failed to generate QR code. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ qr: session.qr });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code. Please try again.' }, { status: 500 });
  }
}
