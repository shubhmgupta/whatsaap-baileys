import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/baileys';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs-extra';
import path from 'path';
import { getUserFromToken } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    // Require Authorization: Bearer <token>
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const userId = user.id;

    // Clear in-memory session state
    try {
      await clearSession(userId.toString());
      console.log(`🧹 Cleared in-memory session for user ${userId}`);
    } catch (err) {
      console.error('Error clearing in-memory session:', err);
    }

    // Remove local session files if present
    try {
      const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
      await fs.remove(sessionDir);
      console.log(`🗑️ Session files deleted for user ${userId}`);
    } catch (err) {
      console.error('Failed to remove session directory:', err);
    }

    // Clear database backup so next connect generates QR
    try {
      await db.update(users).set({ whatsappSession: null }).where(eq(users.id, userId));
      console.log(`🗑️ Cleared database session backup for user ${userId}`);
    } catch (err) {
      console.error('Failed to clear database backup:', err);
    }

    return NextResponse.json({ message: 'Credentials cleared successfully' });
  } catch (error) {
    console.error('Clear credentials error:', error);
    return NextResponse.json({ error: 'Failed to clear credentials' }, { status: 500 });
  }
}
