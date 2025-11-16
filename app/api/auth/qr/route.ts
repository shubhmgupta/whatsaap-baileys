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

    // First check if already connected - don't generate new QR
    const existingSession = await getSession(user.id.toString(), false);
    if (existingSession?.connected && existingSession?.sock?.user) {
      return NextResponse.json({ 
        error: 'Already connected to WhatsApp',
        status: 'already_connected'
      }, { status: 400 });
    }

    // Check if session is currently connecting/restoring from database
    if (existingSession?.connecting) {
      return NextResponse.json({ 
        message: 'Restoring session from database, please wait...',
        status: 'restoring',
        connecting: true
      }, { status: 200 });
    }

    // Use user ID as session identifier - pass waitForQR=true to create/restore session
    const session = await getSession(user.id.toString(), true);

    // Check if session connected without QR (restored from database)
    if (session?.connected && session?.sock?.user) {
      return NextResponse.json({ 
        message: 'Connected successfully using saved session',
        status: 'auto_connected',
        connected: true,
        user: session.sock.user
      }, { status: 200 });
    }

    // Check if still connecting (restoration in progress)
    if (session?.connecting || !session?.qr) {
      return NextResponse.json({ 
        message: 'Connecting to WhatsApp, please wait...',
        status: 'connecting',
        connecting: true
      }, { status: 200 });
    }

    // QR code generated for fresh connection
    return NextResponse.json({ 
      qr: session.qr,
      status: 'qr_generated',
      message: 'Scan QR code to connect'
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code. Please try again.' }, { status: 500 });
  }
}
