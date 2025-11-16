import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/api-auth';

// Force clear all sessions and restart clean
export async function POST(request: Request) {
  try {
    // Get API token from Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN' 
      }, { status: 401 });
    }

    // Get user from API token
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid API token' 
      }, { status: 401 });
    }

    const userId = user.id.toString();

    // Dynamic import to avoid circular dependencies
    const { clearSession } = await import('@/lib/baileys');
    
    await clearSession(userId);

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
