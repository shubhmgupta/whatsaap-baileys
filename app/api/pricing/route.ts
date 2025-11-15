import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plans } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET - List all active plans (public endpoint)
export async function GET() {
  try {
    const activePlans = await db
      .select()
      .from(plans)
      .where(eq(plans.active, true));
    
    console.log('Public API - Plans from DB:', JSON.stringify(activePlans, null, 2));
    return NextResponse.json(activePlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
