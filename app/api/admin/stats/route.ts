import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, plans, payments } from '@/db/schema';
import * as jose from 'jose';
import { eq, sql, and } from 'drizzle-orm';

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

// GET - Admin stats
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get total users count
    const [{ count: totalUsers }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users);

    // Get total revenue from completed payments
    const [{ revenue }] = await db
      .select({ revenue: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as integer)` })
      .from(payments)
      .where(eq(payments.status, 'completed'));

    // Get active plans count
    const [{ count: activePlans }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(plans)
      .where(eq(plans.active, true));

    // Get pending payments count
    const [{ count: pendingPayments }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(payments)
      .where(eq(payments.status, 'pending'));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalRevenue: revenue || 0,
      activePlans: activePlans || 0,
      pendingPayments: pendingPayments || 0,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
