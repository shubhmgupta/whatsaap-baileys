import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { contacts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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

    // Get all contacts for user
    const userContacts = await db.query.contacts.findMany({
      where: eq(contacts.userId, userId),
      orderBy: [desc(contacts.lastMessageAt)]
    });

    return NextResponse.json({
      contacts: userContacts
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error getting contacts:', error);
    return NextResponse.json({ 
      error: 'Failed to get contacts' 
    }, { status: 500, headers: corsHeaders });
  }
}
