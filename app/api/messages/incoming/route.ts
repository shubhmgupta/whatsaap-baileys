import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

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

    // Filter by phone number if provided (handles with/without country code)
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      query = db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, parseInt(userId)),
            or(
              eq(chatMessages.phoneNumber, phoneNumber),
              eq(chatMessages.phoneNumber, cleanPhone),
              sql`${chatMessages.phoneNumber} LIKE ${'%' + last10}`
            )
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
