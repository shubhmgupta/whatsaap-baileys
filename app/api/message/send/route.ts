import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
import { db } from '@/lib/db';
import { messages, users, apiTokens, contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';
import { mkdir } from 'fs/promises';

async function getUserByToken(token: string) {
    if (!token) return null;
    const tokenRecord = await db.query.apiTokens.findFirst({ where: eq(apiTokens.token, token), with: { user: true } });
    return tokenRecord?.user || null;
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const userFromToken = token ? await getUserByToken(token) : null;

    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const message = formData.get('message') as string;
    const file = formData.get('file') as File | null;

    // Get user by token or userId
    const user = userFromToken || (userId ? await db.query.users.findFirst({ where: eq(users.id, parseInt(userId)) }) : null);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.credits === null || user.credits <= 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!message && !file) {
      return NextResponse.json({ error: 'Message or file is required' }, { status: 400 });
    }

    const session = await getSession((user.id || 1).toString());
    if (!session || !session.sock) {
      return NextResponse.json({ error: 'WhatsApp not connected. Please scan QR code first.' }, { status: 404 });
    }

    const formattedNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
    const [result] = await session.sock.onWhatsApp(phoneNumber);

    if (!result?.exists) {
      return NextResponse.json({ error: 'Recipient is not on WhatsApp' }, { status: 400 });
    }

    // Send message with or without file
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const tempPath = join(process.cwd(), 'temp', file.name);
      
      // Save file temporarily
      await writeFile(tempPath, buffer);

      try {
        const fileBuffer = readFileSync(tempPath);
        const mimeType = file.type;

        if (mimeType.startsWith('image/')) {
          await session.sock.sendMessage(result.jid, {
            image: fileBuffer,
            caption: message || undefined,
          });
        } else if (mimeType.startsWith('video/')) {
          await session.sock.sendMessage(result.jid, {
            video: fileBuffer,
            caption: message || undefined,
          });
        } else if (mimeType.startsWith('audio/')) {
          await session.sock.sendMessage(result.jid, {
            audio: fileBuffer,
            mimetype: mimeType,
          });
        } else {
          await session.sock.sendMessage(result.jid, {
            document: fileBuffer,
            mimetype: mimeType,
            fileName: file.name,
            caption: message || undefined,
          });
        }
      } finally {
        // Clean up temp file
        await unlink(tempPath).catch(() => {});
      }
    } else {
      // Send text only
      await session.sock.sendMessage(result.jid, { text: message });
    }

    await db.update(users).set({ credits: user.credits - 1 }).where(eq(users.id, user.id));
    await db.insert(messages).values({ 
      userId: user.id, 
      message: message || `Sent file: ${file?.name}` 
    });

    // Save or update contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, user.id),
        eq(contacts.phoneNumber, phoneNumber)
      ),
    });

    if (!contact) {
      const [newContact] = await db.insert(contacts).values({
        userId: user.id,
        phoneNumber,
        name: phoneNumber,
        lastMessageAt: new Date(),
      }).returning();
      contact = newContact;
    } else {
      await db.update(contacts)
        .set({ lastMessageAt: new Date() })
        .where(eq(contacts.id, contact.id));
    }

    // Save chat message
    await db.insert(chatMessages).values({
      userId: user.id,
      contactId: contact.id,
      phoneNumber,
      message: message || null,
      mediaUrl: file?.name || null,
      mediaType: file?.type || null,
      isFromMe: true,
    });

    return NextResponse.json({ message: 'Message sent successfully', contactId: contact.id });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
