import { NextResponse } from 'next/server';

// Force clear all sessions and restart clean
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Dynamic import to avoid circular dependencies
    const { clearSession } = await import('@/lib/baileys');
    
    await clearSession(userId.toString());

    return NextResponse.json({ 
      message: 'Session cleared successfully. Please scan QR code again.',
      success: true 
    });
  } catch (error) {
    console.error('Restart error:', error);
    return NextResponse.json({ 
      error: 'Failed to restart session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
