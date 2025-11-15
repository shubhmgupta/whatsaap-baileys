import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const session = await getSession(userId);
        
        // Check if socket exists and is connected
        const connected = !!(session?.connected || session?.sock?.user);
        const hasSocket = !!session?.sock;
        const isConnecting = session?.connecting || false;
        
        console.log(`Status check for user ${userId}: connected=${connected}, hasSocket=${hasSocket}, isConnecting=${isConnecting}`);
        
        return NextResponse.json({ 
            connected,
            user: session?.sock?.user || null,
            socketExists: hasSocket,
            connecting: isConnecting,
            lastConnected: session?.lastConnected || null
        });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ connected: false });
    }
}
