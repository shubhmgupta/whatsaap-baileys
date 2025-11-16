import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
import { getUserFromToken, ensureWhatsAppSession } from '@/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
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

    // Check current session status and auto-restore if needed
    const sessionCheck = await ensureWhatsAppSession(userId);
    
    // If already connected, return success
    if (sessionCheck.status === 'connected' && sessionCheck.session?.sock?.user) {
      return NextResponse.json({ 
        message: 'Already connected to WhatsApp',
        status: 'already_connected',
        connected: true,
        user: {
          id: sessionCheck.session.sock.user.id,
          name: sessionCheck.session.sock.user.name
        }
      }, { headers: corsHeaders });
    }
    
    // If restoring, check if QR or connection is available
    const existingSession = await getSession(userId.toString(), false);
    
    if (existingSession?.qr) {
      return NextResponse.json({ 
        qr: existingSession.qr,
        status: 'qr_generated',
        message: 'Scan QR code to connect'
      }, { headers: corsHeaders });
    }
    
    if (existingSession?.connecting && !existingSession?.qr) {
      return NextResponse.json({ 
        status: 'restoring',
        message: 'Restoring session from database. Please wait...'
      }, { headers: corsHeaders });
    }

    // No session or disconnected - generate new QR
    console.log(`📱 Generating QR code for user ${userId}...`);
    const session = await getSession(userId.toString(), true);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Failed to initialize WhatsApp session' 
      }, { status: 500, headers: corsHeaders });
    }

    // Wait for QR code to be generated
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const currentSession = await getSession(userId.toString(), false);
      
      if (currentSession?.qr) {
        return NextResponse.json({ 
          qr: currentSession.qr,
          status: 'qr_generated',
          message: 'Scan QR code to connect'
        }, { headers: corsHeaders });
      }
      
      if (currentSession?.connected && currentSession?.sock?.user) {
        return NextResponse.json({ 
          message: 'Connected successfully',
          status: 'auto_connected',
          connected: true,
          user: {
            id: currentSession.sock.user.id,
            name: currentSession.sock.user.name
          }
        }, { headers: corsHeaders });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ 
      error: 'QR code generation timeout. Please try again.' 
    }, { status: 408, headers: corsHeaders });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ 
      error: 'Failed to generate QR code',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers: corsHeaders });
  }
}
