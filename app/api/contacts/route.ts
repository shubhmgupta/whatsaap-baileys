import { db } from '@/lib/db';
import { contacts, users } from '@/db/schema';
import { eq, and, or, like, sql, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const offset = (page - 1) * limit;
    const userIdNum = parseInt(userId, 10);
    
    // Build where conditions
    const conditions = [eq(contacts.userId, userIdNum)];

    // Exclude the user's currently connected phone number from the contacts list
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userIdNum),
    });
    const ownNumber = userRecord?.phoneNumber?.replace(/[^0-9]/g, '');
    if (ownNumber && ownNumber.length >= 7) {
      const ownLast10 = ownNumber.slice(-10);
      conditions.push(sql`${contacts.phoneNumber} NOT LIKE ${'%' + ownLast10}`);
    }
    
    if (search) {
      conditions.push(
        or(
          like(contacts.name, `%${search}%`),
          like(contacts.phoneNumber, `%${search}%`)
        )!
      );
    }

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(...conditions));
    
    const total = Number(totalResult[0]?.count || 0);

    // Get paginated contacts
    const userContacts = await db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.lastMessageAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      contacts: userContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phoneNumber, userId } = body;

    if (!name || !phoneNumber || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicate phone number for the same user
    const existingContact = await db.select().from(contacts).where(and(eq(contacts.userId, userId), eq(contacts.phoneNumber, phoneNumber)));
    if (existingContact.length > 0) {
      return NextResponse.json({ error: 'A contact with this phone number already exists.' }, { status: 409 });
    }

    const [result] = await db.insert(contacts).values({
      name,
      phoneNumber,
      userId,
    }).$returningId();

    const createdContact = await db.query.contacts.findFirst({
      where: eq(contacts.id, result.id),
    });

    return NextResponse.json({ contact: createdContact }, { status: 201 });
  } catch (error) {
    console.error('Failed to create contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
