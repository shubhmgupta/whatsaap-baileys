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

// PUT - Update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, credits, features, discountPercentage, discountLabel, active } = body;

    const planId = parseInt(id);
    await db
      .update(plans)
      .set({
        name,
        price: parseInt(price),
        credits: parseInt(credits),
        features: features || null,
        discountPercentage: discountPercentage ? parseInt(discountPercentage) : 0,
        discountLabel: discountLabel || null,
        active,
      })
      .where(eq(plans.id, planId));

    const updatedPlan = await db.query.plans.findFirst({
      where: eq(plans.id, planId),
    });

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// DELETE - Delete plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    await db.delete(plans).where(eq(plans.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
