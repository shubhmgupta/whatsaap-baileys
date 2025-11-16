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
    
    const connected = !!(session?.connected && session?.sock?.user);
    
    return NextResponse.json({
      connected,
      user: connected ? {
        id: session.sock.user.id,
        name: session.sock.user.name
      } : null,
      socketExists: !!session?.sock,
      connecting: session?.connecting || false,
      lastConnected: session?.lastConnected || null
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json({ 
      error: 'Failed to check connection status' 
    }, { status: 500, headers: corsHeaders });
  }
}
