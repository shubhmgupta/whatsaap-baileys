import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const phoneNumber = searchParams.get('phoneNumber');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let query = db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, parseInt(userId)))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);

    // Filter by phone number if provided
    if (phoneNumber) {
      query = db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, parseInt(userId)),
            eq(chatMessages.phoneNumber, phoneNumber)
          )
        )
        .orderBy(desc(chatMessages.timestamp))
        .limit(limit);
    }

    const messages = await query;

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error fetching incoming messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
