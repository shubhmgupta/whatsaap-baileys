import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
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

// GET - List all users
export async function GET(request: NextRequest) {
  console.log('GET /api/admin/users called');
  
  const admin = await verifyAdmin(request);
  
  if (!admin) {
    console.log('Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Admin verified:', admin.email);

  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullname: users.fullname,
        credits: users.credits,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);

    console.log('Users fetched from DB:', allUsers.length);

    // Map fullname to name for frontend
    const mappedUsers = allUsers.map(user => ({
      ...user,
      name: user.fullname,
    }));

    console.log('Returning users:', mappedUsers);
    return NextResponse.json(mappedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users', details: String(error) }, { status: 500 });
  }
}

// PUT - Update user details (existing functionality)
export async function PUT(request: NextRequest) {
    const admin = await verifyAdmin(request);
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, planId, paymentGatewayEnabled } = await request.json();
    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await db.update(users).set({ planId, paymentGatewayEnabled }).where(eq(users.id, userId));

    return NextResponse.json({ message: 'User updated successfully' });
}
