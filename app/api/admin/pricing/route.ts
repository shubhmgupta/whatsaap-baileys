import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plans, users } from '@/db/schema';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const { payload } = await jose.jwtVerify(token, secret);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId as number))
      .limit(1);

    if (user && user.role === 'admin') {
      return user;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// GET - List all plans
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allPlans = await db.select().from(plans);
    return NextResponse.json(allPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST - Create new plan
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, price, credits, features, discountPercentage, discountLabel, active } = body;

    if (!name || price === undefined || credits === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newPlan] = await db
      .insert(plans)
      .values({
        name,
        price: parseFloat(price),
        credits: parseInt(credits),
        features: features || null,
        discountPercentage: discountPercentage ? parseInt(discountPercentage) : 0,
        discountLabel: discountLabel || null,
        active: active !== undefined ? active : true,
      })
      .returning();

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
