import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
import { getUserFromToken } from '@/lib/api-auth';

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

    const userId = user.id.toString();
    const session = await getSession(userId, false);

    if (!session || !session.connected) {
      return NextResponse.json({ 
        error: 'WhatsApp not connected',
        needsQR: true
      }, { status: 400, headers: corsHeaders });
    }

    // Get incoming messages from messageStore
    const messageStore = (globalThis as any).messageStore || new Map();
    const userMessages = messageStore.get(userId) || [];

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
