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
        
        // Check if socket exists and has an active user connection
        const connected = !!(session?.sock?.user);
        
        return NextResponse.json({ 
            connected,
            user: session?.sock?.user || null
        });
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ connected: false });
    }
}
