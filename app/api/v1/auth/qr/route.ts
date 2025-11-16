import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
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

    const userId = user.id;

    // First check if already connected - don't generate new QR
    const existingSession = await getSession(userId.toString(), false);
    if (existingSession?.connected && existingSession?.sock?.user) {
      return NextResponse.json({ 
        error: 'Already connected to WhatsApp',
        status: 'already_connected',
        user: {
          id: existingSession.sock.user.id,
          name: existingSession.sock.user.name
        }
      }, { status: 400 });
    }

    // Check if currently connecting
    if (existingSession?.connecting) {
      // Check if QR exists
      if (existingSession.qr) {
        return NextResponse.json({ 
          qr: existingSession.qr,
          status: 'qr_generated',
          message: 'Scan QR code to connect'
        });
      }
      
      return NextResponse.json({ 
        status: 'connecting',
        message: 'Connection in progress. Please wait...'
      });
    }

    // Try to restore from database first (no QR generation)
    console.log(`🔄 Checking for existing session backup for user ${userId}...`);
    const restoredSession = await getSession(userId.toString(), false);
    
    // Wait a moment for restoration to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if restored and connected
    const checkSession = await getSession(userId.toString(), false);
    if (checkSession?.connected && checkSession?.sock?.user) {
      return NextResponse.json({ 
        message: 'Connected successfully using saved session',
        status: 'auto_connected',
        connected: true,
        user: {
          id: checkSession.sock.user.id,
          name: checkSession.sock.user.name
        }
      });
    }

    // If not restored, generate new QR code
    console.log(`📱 Generating QR code for user ${userId}...`);
    const session = await getSession(userId.toString(), true);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Failed to initialize WhatsApp session' 
      }, { status: 500 });
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
        });
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
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ 
      error: 'QR code generation timeout. Please try again.' 
    }, { status: 408 });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ 
      error: 'Failed to generate QR code' 
    }, { status: 500 });
  }
}
