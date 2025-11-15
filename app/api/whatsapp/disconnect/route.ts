import { NextResponse } from 'next/server';
import { logoutSession } from '@/lib/baileys';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Disconnect WhatsApp session
    await logoutSession(userId.toString());

    return NextResponse.json({ 
      message: 'WhatsApp disconnected successfully',
      success: true 
    });
  } catch (error) {
    console.error('WhatsApp disconnect error:', error);
    return NextResponse.json({ 
      error: 'Failed to disconnect WhatsApp',
      success: false 
    }, { status: 500 });
  }
}
