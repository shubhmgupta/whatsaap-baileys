import { db } from '@/lib/db';
import { apiTokens, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof users>;

export async function getUserFromToken(token: string): Promise<User | null> {
  if (!token) return null;
  
  const tokenRecord = await db.query.apiTokens.findFirst({ 
    where: eq(apiTokens.token, token), 
    with: { user: true } 
  });
  
  if (!tokenRecord?.user) return null;
  
  return tokenRecord.user as User;
}
