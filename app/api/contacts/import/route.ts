import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import * as xlsx from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and User ID are required' }, { status: 400 });
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
        return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = xlsx.read(bytes, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json({ error: 'The Excel file is empty or in an unsupported format.' }, { status: 400 });
    }

    const newContacts = data.map(row => ({
      name: String(row.Name || row.name || ''),
      phoneNumber: String(row['Phone Number'] || row.phoneNumber || '').replace(/\D/g, ''),
      userId: userIdNum,
    })).filter(c => c.name && c.phoneNumber);

    if (newContacts.length === 0) {
        return NextResponse.json({ error: 'No valid contacts found in the file. Please ensure columns are named "Name" and "Phone Number".' }, { status: 400 });
    }

    // Fetch existing phone numbers for the user to check for duplicates
    const existingPhoneNumbers = await db.select({ phoneNumber: contacts.phoneNumber }).from(contacts).where(eq(contacts.userId, userIdNum));
    const existingNumbersSet = new Set(existingPhoneNumbers.map(c => c.phoneNumber));

    const contactsToInsert = newContacts.filter(c => !existingNumbersSet.has(c.phoneNumber));

    let createdCount = 0;
    if (contactsToInsert.length > 0) {
      await db.insert(contacts).values(contactsToInsert);
      createdCount = contactsToInsert.length;
    }
    
    const skippedCount = newContacts.length - createdCount;

    return NextResponse.json({ 
        message: 'Import completed.',
        createdCount,
        skippedCount
    });

  } catch (error) {
    console.error('Failed to import contacts:', error);
    return NextResponse.json({ error: 'Internal server error during import.' }, { status: 500 });
  }
}
