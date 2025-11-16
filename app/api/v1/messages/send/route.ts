import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
import { getUserFromToken } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { messages, users, contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';
import { mkdir } from 'fs/promises';

export async function POST(request: Request) {
  try {
    // Get API token from Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN' 
      }, { status: 401 });
    }

    // Get user from API token
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid API token' 
      }, { status: 401 });
    }

    // Check credits
    if (user.credits === null || user.credits <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        remainingCredits: 0
      }, { status: 402 });
    }

    // Parse request body (support both JSON and FormData)
    const contentType = request.headers.get('content-type') || '';
    let phoneNumber: string;
    let message: string;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      phoneNumber = formData.get('phoneNumber') as string;
      message = formData.get('message') as string;
      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      phoneNumber = body.phoneNumber;
      message = body.message;
    }

    if (!phoneNumber) {
      return NextResponse.json({ 
        error: 'Phone number is required' 
      }, { status: 400 });
    }

    if (!message && !file) {
      return NextResponse.json({ 
        error: 'Message or file is required' 
      }, { status: 400 });
    }

    const userId = user.id;

    // First check if session exists in memory
    let session = await getSession(userId.toString(), false);
    
    // If not connected, try to restore from database and reconnect
    if (!session || !session.connected || !session.sock?.user) {
      console.log(`📡 Attempting to restore session for user ${userId} before sending message...`);
      
      // Try to restore and connect
      session = await getSession(userId.toString(), true);
      
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
            }
            
            if (attempts >= 30) { // 30 attempts * 500ms = 15 seconds
              clearInterval(checkInterval);
              resolve(false);
            }
          }, 500);
        });
        
        // Refresh session after waiting
        session = await getSession(userId.toString(), false);
      }
    }

    if (!session || !session.connected || !session.sock?.user) {
      return NextResponse.json({ 
        error: 'WhatsApp not connected. Please scan QR code first.',
        needsQR: true
      }, { status: 400 });
    }

    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
    let sentMessage;

    if (file) {
      // Handle file upload
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create temp directory if it doesn't exist
      const tempDir = join(process.cwd(), 'temp');
      await mkdir(tempDir, { recursive: true });
      
      const tempFilePath = join(tempDir, `${Date.now()}_${file.name}`);
      await writeFile(tempFilePath, buffer);

      try {
        const fileBuffer = readFileSync(tempFilePath);
        const mimeType = file.type;

        if (mimeType.startsWith('image/')) {
          sentMessage = await session.sock.sendMessage(jid, {
            image: fileBuffer,
            caption: message || undefined
          });
        } else if (mimeType.startsWith('video/')) {
          sentMessage = await session.sock.sendMessage(jid, {
            video: fileBuffer,
            caption: message || undefined
          });
        } else if (mimeType.startsWith('audio/')) {
          sentMessage = await session.sock.sendMessage(jid, {
            audio: fileBuffer,
            mimetype: mimeType
          });
        } else {
          sentMessage = await session.sock.sendMessage(jid, {
            document: fileBuffer,
            mimetype: mimeType,
            fileName: file.name,
            caption: message || undefined
          });
        }

        await unlink(tempFilePath);
      } catch (error) {
        await unlink(tempFilePath).catch(() => {});
        throw error;
      }
    } else {
      // Send text message
      sentMessage = await session.sock.sendMessage(jid, { text: message });
    }

    // Deduct credit
    await db.update(users).set({ credits: user.credits - 1 }).where(eq(users.id, userId));
    await db.insert(messages).values({
      phoneNumber,
      message: message || '[Media file]',
      status: 'sent'
    } as any);

    // Update or create contact
    const existingContact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.phoneNumber, phoneNumber)
      )
    });

    if (existingContact) {
      await db.update(contacts).set({
        lastMessageAt: new Date()
      }).where(eq(contacts.id, existingContact.id));
    } else {
      await db.insert(contacts).values({
        userId,
        phoneNumber,
        name: phoneNumber,
        lastMessageAt: new Date()
      });
    }

    // Store in chat messages
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.phoneNumber, phoneNumber)
      )
    });

    if (contact) {
      await db.insert(chatMessages).values({
        userId,
        contactId: contact.id,
        phoneNumber,
        message: message || '[Media file]',
        isFromMe: true,
        timestamp: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      remainingCredits: user.credits - 1
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ 
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
