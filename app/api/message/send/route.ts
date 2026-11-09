import { NextResponse } from 'next/server';
import { getSession, uploadBufferToCloudinary } from '@/lib/baileys';
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

    const contentType = request.headers.get('content-type') || '';
    let userId: string;
    let phoneNumber: string;
    let message: string;
    let file: File | null = null;

    // Handle both FormData and JSON
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      userId = formData.get('userId') as string;
      phoneNumber = formData.get('phoneNumber') as string;
      message = formData.get('message') as string;
      file = formData.get('file') as File | null;
    } else {
      // JSON body
      const body = await request.json();
      userId = body.userId;
      phoneNumber = body.phoneNumber;
      message = body.message;
    }

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

    // First check if session exists in memory
    let session = await getSession(user.id.toString(), false);
    
    // If not connected, try to restore from database and reconnect
    if (!session || !session.connected || !session.sock?.user) {
      console.log(`📡 Attempting to restore session for user ${user.id} before sending message...`);
      
      // Try to restore and connect (waitForQR=false means no QR generation, just restore)
      session = await getSession(user.id.toString(), true);
      
      // Wait up to 15 seconds for connection to establish
      if (session && !session.connected) {
        await new Promise((resolve) => {
          let attempts = 0;
          const checkInterval = setInterval(() => {
            const currentSession = session;
            attempts++;
            
            if (currentSession?.connected && currentSession?.sock?.user) {
              clearInterval(checkInterval);
              resolve(true);
            } else if (attempts >= 30) { // 30 * 500ms = 15 seconds
              clearInterval(checkInterval);
              resolve(false);
            }
          }, 500);
        });
        
        // Refresh session after waiting
        session = await getSession(user.id.toString(), false);
      }
    }
    
    // Final check - if still not connected, return error
    if (!session || !session.connected || !session.sock?.user) {
      return NextResponse.json({ 
        error: 'WhatsApp not connected. Unable to restore session. Please connect via dashboard.',
        needsQR: true 
      }, { status: 400 });
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

        // Upload outgoing file to Cloudinary to get a public URL
        let outgoingMediaUrl: string | null = null;
        try {
          outgoingMediaUrl = await uploadBufferToCloudinary(fileBuffer, mimeType, file.name);
          console.log('   🔗 Outgoing file uploaded to Cloudinary:', outgoingMediaUrl);
        } catch (err) {
          console.error('   ⚠️ Failed to upload outgoing file to Cloudinary:', err);
          outgoingMediaUrl = null;
        }

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

        (file as any)._uploadedUrl = outgoingMediaUrl;
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
      const [result] = await db.insert(contacts).values({
        userId: user.id,
        phoneNumber,
        name: phoneNumber,
        lastMessageAt: new Date(),
      }).$returningId();
      contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, result.id),
      });
    } else {
      await db.update(contacts)
        .set({ lastMessageAt: new Date() })
        .where(eq(contacts.id, contact.id));
    }

    if (!contact) {
      throw new Error('Failed to create contact');
    }

    // Save chat message
    const outgoingMediaUrl = (file as any)?._uploadedUrl ?? null;
    await db.insert(chatMessages).values({
      userId: user.id,
      contactId: contact.id,
      phoneNumber,
      message: message || null,
      mediaUrl: outgoingMediaUrl,
      mediaType: file?.type || null,
      isFromMe: true,
    });

    return NextResponse.json({ message: 'Message sent successfully', contactId: contact.id });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
