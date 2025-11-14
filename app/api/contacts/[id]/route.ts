import { db } from '@/lib/db';
import { contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const contactId = parseInt(params.id, 10);
    const body = await req.json();
    const { name, phoneNumber, userId } = body;

    if (isNaN(contactId)) {
        return NextResponse.json({ error: 'Invalid Contact ID' }, { status: 400 });
    }

    if (!name || !phoneNumber || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the contact belongs to the user
    const existingContact = await db.select().from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));

    if (existingContact.length === 0) {
      return NextResponse.json({ error: 'Contact not found or you do not have permission to edit it.' }, { status: 404 });
    }

    // Check if the new phone number is already in use by another contact of the same user
    const duplicateContact = await db.select().from(contacts).where(and(
        eq(contacts.userId, userId),
        eq(contacts.phoneNumber, phoneNumber)
    ));

    if (duplicateContact.length > 0 && duplicateContact[0].id !== contactId) {
        return NextResponse.json({ error: 'Another contact with this phone number already exists.' }, { status: 409 });
    }

    const updatedContact = await db.update(contacts).set({
      name,
      phoneNumber,
    }).where(eq(contacts.id, contactId)).returning();

    return NextResponse.json({ contact: updatedContact[0] });
  } catch (error) {
    console.error('Failed to update contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const contactId = parseInt(params.id, 10);
    const body = await req.json();
    const { userId } = body;

    if (isNaN(contactId)) {
        return NextResponse.json({ error: 'Invalid Contact ID' }, { status: 400 });
    }

     if (!userId) {
      return NextResponse.json({ error: 'User ID is required for authorization' }, { status: 400 });
    }

    // Verify the contact belongs to the user before deleting
    const contactToDelete = await db.select().from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));

    if (contactToDelete.length === 0) {
      return NextResponse.json({ error: 'Contact not found or you do not have permission to delete it.' }, { status: 404 });
    }

    // First delete all chat messages associated with this contact
    await db.delete(chatMessages).where(eq(chatMessages.contactId, contactId));
    
    // Then delete the contact
    await db.delete(contacts).where(eq(contacts.id, contactId));

    return NextResponse.json({ message: 'Contact deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
