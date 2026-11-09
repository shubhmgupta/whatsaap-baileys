import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

// Get chat messages for a contact
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const contactId = parseInt(id);
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const phoneNumber = searchParams.get('phoneNumber');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        // Query by contactId OR phone number (with or without country code)
        const messages = await db.query.chatMessages.findMany({
            where: and(
                eq(chatMessages.userId, parseInt(userId)),
                or(
                    eq(chatMessages.contactId, contactId),
                    eq(chatMessages.phoneNumber, phoneNumber || ''),
                    eq(chatMessages.phoneNumber, cleanPhone),
                    sql`${chatMessages.phoneNumber} LIKE ${'%' + last10}`
                )
            ),
            orderBy: [desc(chatMessages.timestamp)],
            limit: 100,
        });

        return NextResponse.json({ messages: messages.reverse() });
    } catch (error) {
        console.error('Get chat messages error:', error);
        return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
    }
}

// Save a chat message
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const contactId = parseInt(id);
        const { userId, phoneNumber, message, mediaUrl, mediaType, isFromMe } = await request.json();

        if (!userId || !phoneNumber) {
            return NextResponse.json({ error: 'User ID and phone number are required' }, { status: 400 });
        }

        const [result] = await db
            .insert(chatMessages)
            .values({
                userId,
                contactId,
                phoneNumber,
                message,
                mediaUrl,
                mediaType,
                isFromMe: isFromMe !== undefined ? isFromMe : true,
            })
            .$returningId();

        const newMessage = await db.query.chatMessages.findFirst({
            where: eq(chatMessages.id, result.id),
        });

        return NextResponse.json({ message: newMessage });
    } catch (error) {
        console.error('Save chat message error:', error);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
}
