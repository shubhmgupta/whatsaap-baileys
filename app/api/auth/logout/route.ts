import { NextResponse } from 'next/server';
import { logoutSession } from '@/lib/baileys';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Properly disconnect from WhatsApp (invalidates session on phone)
    console.log(`🔌 Disconnecting WhatsApp for user ${userId}...`);
    await logoutSession(userId.toString());
    
    // Clear database backup
    try {
      await db.update(users).set({ 
        whatsappSession: null
      }).where(eq(users.id, parseInt(userId)));
      console.log(`🗑️ Cleared database backup for user ${userId}`);
    } catch (dbError) {
      console.error('Error clearing database backup:', dbError);
    }
    
    const response = NextResponse.json({ 
      message: 'WhatsApp disconnected successfully. Session invalidated.' 
    });
    
    // Clear the authentication token cookie (web session)
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to disconnect. Please try again.' }, { status: 500 });
  }
}
