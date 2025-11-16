import { db } from '@/lib/db';
import { apiTokens, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { getSession } from '@/lib/baileys';

export type User = InferSelectModel<typeof users>;

export async function getUserFromToken(token: string): Promise<User | null> {
  if (!token) return null;
  
  // Use join query instead of relational query to avoid schema relation dependency
  const result = await db
    .select({
      user: users,
    })
    .from(apiTokens)
    .innerJoin(users, eq(apiTokens.userId, users.id))
    .where(eq(apiTokens.token, token))
    .limit(1);
  
  if (!result.length || !result[0].user) return null;
  
  return result[0].user;
}

// Track restoration attempts to prevent duplicate restoration
const restorationAttempts = new Map<number, { count: number; lastAttempt: number }>();

/**
 * Ensures WhatsApp session is connected for the user.
 * If session exists in database but not in memory, it will restore it.
 * Returns session status: connected, restoring, or needs_qr
 */
export async function ensureWhatsAppSession(userId: number): Promise<{
  status: 'connected' | 'restoring' | 'needs_qr';
  session?: any;
  message?: string;
}> {
  // Check if session exists in memory
  const existingSession = await getSession(userId.toString(), false);
  
  // Already connected
  if (existingSession?.connected && existingSession?.sock?.user) {
    // Clear restoration attempts on successful connection
    restorationAttempts.delete(userId);
    return { 
      status: 'connected', 
      session: existingSession 
    };
  }
  
  // Check if restoring/connecting
  if (existingSession?.connecting) {
    return { 
      status: 'restoring',
      message: 'WhatsApp session is being restored. Please wait...'
    };
  }
  
  // If session exists but is dead (has socket but not connected/connecting), clear it
  if (existingSession && existingSession.sock && !existingSession.connected && !existingSession.connecting) {
    console.log(`⚠️ Dead session detected for user ${userId}. Clearing...`);
    const { clearSession } = await import('@/lib/baileys');
    await clearSession(userId.toString());
  }
  
  // Check if user has a database backup
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  
  if (user?.whatsappSession) {
    // Check restoration attempts
    const now = Date.now();
    const attempt = restorationAttempts.get(userId);
    
    // If we've tried 2 times in the last 60 seconds, clear the invalid backup
    if (attempt && attempt.count >= 2 && (now - attempt.lastAttempt) < 60000) {
      console.log(`⚠️ Restoration failed ${attempt.count} times for user ${userId}. Clearing invalid database backup...`);
      
      try {
        await db.update(users).set({ whatsappSession: null }).where(eq(users.id, userId));
        console.log(`🗑️ Cleared invalid database backup for user ${userId}`);
        restorationAttempts.delete(userId);
      } catch (error) {
        console.error('Failed to clear database backup:', error);
      }
      
      return {
        status: 'needs_qr',
        message: 'Previous session invalid. Please generate a new QR code.'
      };
    }
    
    // Track this restoration attempt
    if (!attempt || (now - attempt.lastAttempt) > 60000) {
      // First attempt or reset after 1 minute
      restorationAttempts.set(userId, { count: 1, lastAttempt: now });
    } else {
      // Increment attempt count
      restorationAttempts.set(userId, { count: attempt.count + 1, lastAttempt: now });
    }
    
    console.log(`🔄 Found database session for user ${userId}, initiating restoration (attempt ${restorationAttempts.get(userId)?.count || 1})...`);
    
    // Trigger restoration (non-blocking)
    getSession(userId.toString(), true).catch(err => {
      console.error('Background restoration failed:', err);
    });
    
    return {
      status: 'restoring',
      message: 'WhatsApp session is being restored from database. Please retry in a few seconds.'
    };
  }
  
  // No session at all - needs QR
  return {
    status: 'needs_qr',
    message: 'WhatsApp not connected. Please generate QR code first.'
  };
}
