import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { messages } from '@/db/schema';

export async function POST(request: Request) {
  try {
    // Get API token from Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN' 
      }, { status: 401 });
    }

    // Get user from API token
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid API token' 
      }, { status: 401 });
    }

    const userId = user.id;

    // Parse incoming webhook data
    const body = await request.json();
    console.log('Received webhook:', body);

    const { from, message, timestamp } = body;
    
    if (!from || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: from, message' 
      }, { status: 400 });
    }

    // Store incoming message in database
    await db.insert(messages).values({ 
      userId, 
      message, 
      receivedAt: timestamp ? new Date(timestamp * 1000) : new Date() 
    });

    return NextResponse.json({ 
      message: 'Webhook received and stored successfully' 
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Failed to process webhook' 
    }, { status: 500 });
  }
}
