import { NextResponse } from 'next/server';
import { logoutSession } from '@/lib/baileys';
import { getUserFromToken } from '@/lib/api-auth';

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
    
    // Logout from WhatsApp (invalidates session on phone and clears database)
    await logoutSession(userId);
    
    return NextResponse.json({
      message: 'WhatsApp disconnected successfully. Session invalidated.'
    });

  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return NextResponse.json({ 
      error: 'Failed to disconnect WhatsApp' 
    }, { status: 500 });
  }
}
