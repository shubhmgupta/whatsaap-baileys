import { db } from '@/lib/db';
import { apiTokens, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

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
