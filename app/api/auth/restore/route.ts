import { NextResponse } from 'next/server';
import { tryRestoreFromDatabase } from '@/lib/baileys';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const restored = await tryRestoreFromDatabase(userId.toString());
    if (restored) {
      return NextResponse.json({ status: 'restored', connected: !!restored.connected, user: restored.user || null }, { status: 200 });
    }

    return NextResponse.json({ status: 'no_backup', message: 'No session backup found in database' }, { status: 200 });
  } catch (error) {
    console.error('Restore API error:', error);
    return NextResponse.json({ error: 'Failed to restore session' }, { status: 500 });
  }
}
