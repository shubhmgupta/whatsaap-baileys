import { NextResponse } from 'next/server';
import { tryRestoreFromDatabase } from '@/lib/baileys';
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
    
    // Try to restore from database
    const result = await tryRestoreFromDatabase(userId);
    
    if (result.connected && result.user) {
      return NextResponse.json({
        status: 'restored',
        connected: true,
        user: result.user
      });
    }
    
    return NextResponse.json({
      status: 'no_backup',
      message: 'No session backup found in database. Please scan QR code.'
    });

  } catch (error) {
    console.error('Error restoring session:', error);
    return NextResponse.json({ 
      error: 'Failed to restore session' 
    }, { status: 500 });
  }
}
