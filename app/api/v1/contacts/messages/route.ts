import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { chatMessages, contacts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Get message history with a specific contact (by phone number)
export async function GET(request: Request) {
    try {
        // Get API token from Authorization header
        const token = request.headers.get('Authorization')?.split(' ')[1];

        if (!token) {
            return NextResponse.json({
                error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN'
            }, { status: 401, headers: corsHeaders });
        }

        // Get user from API token
        const user = await getUserFromToken(token);

        if (!user) {
            return NextResponse.json({
                error: 'Invalid API token'
            }, { status: 401, headers: corsHeaders });
        }

        const userId = user.id;

        // Get phone number from query params
        const url = new URL(request.url);
        const phoneNumber = url.searchParams.get('phoneNumber');

        if (!phoneNumber) {
            return NextResponse.json({
                error: 'Phone number is required. Usage: /api/v1/contacts/messages?phoneNumber=1234567890'
            }, { status: 400, headers: corsHeaders });
        }

        // Find or create contact
        let contact = await db.query.contacts.findFirst({
            where: and(
                eq(contacts.userId, userId),
                eq(contacts.phoneNumber, phoneNumber)
            )
        });

        if (!contact) {
            // Create contact if it doesn't exist
            const [result] = await db.insert(contacts).values({
                userId,
                phoneNumber,
                name: phoneNumber
            }).$returningId();
            contact = await db.query.contacts.findFirst({
                where: eq(contacts.id, result.id)
            });
        }

        if (!contact) {
            return NextResponse.json({
                error: 'Failed to find or create contact'
            }, { status: 500, headers: corsHeaders });
        }

        // Get messages for this contact (last 100 messages in chronological order)
        const messages = await db.query.chatMessages.findMany({
            where: and(
                eq(chatMessages.userId, userId),
                eq(chatMessages.contactId, contact.id)
            ),
            orderBy: [desc(chatMessages.timestamp)],
            limit: 100
        });

        // Reverse to get chronological order (oldest first)
        messages.reverse();

        return NextResponse.json({
            messages
        }, { status: 200, headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({
            error: 'Failed to fetch messages'
        }, { status: 500, headers: corsHeaders });
    }
}

// Save a chat message
export async function POST(request: Request) {
    try {
        // Get API token from Authorization header
        const token = request.headers.get('Authorization')?.split(' ')[1];

        if (!token) {
            return NextResponse.json({
                error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN'
            }, { status: 401, headers: corsHeaders });
        }

        // Get user from API token
        const user = await getUserFromToken(token);

        if (!user) {
            return NextResponse.json({
                error: 'Invalid API token'
            }, { status: 401, headers: corsHeaders });
        }

        const userId = user.id;
        const body = await request.json();
        const { phoneNumber, message, mediaUrl, mediaType, isFromMe = true } = body;

        if (!phoneNumber) {
            return NextResponse.json({
                error: 'Phone number is required'
            }, { status: 400, headers: corsHeaders });
        }

        // Get or create contact for this phone number
        let contact = await db.query.contacts.findFirst({
            where: and(
                eq(contacts.userId, userId),
                eq(contacts.phoneNumber, phoneNumber)
            )
        });

        if (!contact) {
            // Create contact if it doesn't exist
            const [result] = await db.insert(contacts).values({
                userId,
                phoneNumber,
                name: phoneNumber
            }).$returningId();
            contact = await db.query.contacts.findFirst({
                where: eq(contacts.id, result.id)
            });
        }

        if (!contact) {
            return NextResponse.json({
                error: 'Failed to find or create contact'
            }, { status: 500, headers: corsHeaders });
        }

        // Insert message
        const [result] = await db.insert(chatMessages).values({
            userId,
            contactId: contact.id,
            phoneNumber,
            message: message || null,
            mediaUrl: mediaUrl || null,
            mediaType: mediaType || null,
            isFromMe,
            timestamp: new Date()
        }).$returningId();

        const newMessage = await db.query.chatMessages.findFirst({
            where: eq(chatMessages.id, result.id)
        });

        return NextResponse.json({
            message: newMessage
        }, { status: 201, headers: corsHeaders });
    } catch (error) {
        console.error('Error saving message:', error);
        return NextResponse.json({
            error: 'Failed to save message'
        }, { status: 500, headers: corsHeaders });
    }
}
