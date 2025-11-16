import { NextResponse } from 'next/server';
import { getUserFromToken, ensureWhatsAppSession } from '@/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    // Get API token from Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN' 
      }, { status: 401, headers: corsHeaders });
    }

    // Get user from API token
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid API token' 
      }, { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Ensure WhatsApp session is connected (auto-restore if needed)
    const sessionCheck = await ensureWhatsAppSession(userId);
    
    if (sessionCheck.status === 'restoring') {
      return NextResponse.json({ 
        error: sessionCheck.message || 'WhatsApp session is being restored',
        status: 'restoring',
        message: 'Please retry in a few seconds'
      }, { status: 503, headers: corsHeaders });
    }
    
    if (sessionCheck.status === 'needs_qr') {
      return NextResponse.json({ 
        error: sessionCheck.message || 'WhatsApp not connected',
        status: 'needs_qr',
        message: 'Please generate QR code at /api/v1/auth/qr first'
      }, { status: 400, headers: corsHeaders });
    }

    // Get incoming messages from messageStore
    const messageStore = (globalThis as any).messageStore || new Map();
    const userMessages = messageStore.get(userId.toString()) || [];

    return NextResponse.json({
      messages: userMessages
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error getting incoming messages:', error);
    return NextResponse.json({ 
      error: 'Failed to get incoming messages' 
    }, { status: 500, headers: corsHeaders });
  }
}
