import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/db/schema';

export async function POST(request: Request) {
    const body = await request.json();
    console.log('Received webhook:', body);

    // Here you would process the incoming message and store it in the database
    // For example, if the webhook sends a message object:
    const { from, message, timestamp } = body;
    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.phoneNumber, from) });
    if (user) {
        await db.insert(messages).values({ userId: user.id, message, receivedAt: new Date(timestamp * 1000) });
    }


  return NextResponse.json({ message: 'Webhook received' });
}
