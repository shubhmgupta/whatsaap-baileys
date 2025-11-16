import { NextResponse } from 'next/server';
import { getSession } from '@/lib/baileys';
import { getUserFromToken } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { messages, users, contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { readFileSync } from 'fs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // Get API token from Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authorization token required. Format: Bearer YOUR_API_TOKEN' 
      }, { status: 401, headers: corsHeaders });
    }

    // Get user from API token
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid API token' 
      }, { status: 401, headers: corsHeaders });
    }

    // Check credits
    if (user.credits === null || user.credits <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient credits' 
      }, { status: 402, headers: corsHeaders });
    }

    const contentType = request.headers.get('content-type') || '';
    let phoneNumber: string;
    let message: string;
    let file: File | null = null;

    // Handle both FormData and JSON
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      phoneNumber = formData.get('phoneNumber') as string;
      message = (formData.get('message') as string) || '';
      file = formData.get('file') as File | null;
    } else {
      // JSON body
      const body = await request.json();
      phoneNumber = body.phoneNumber;
      message = body.message || '';
    }

    if (!phoneNumber) {
      return NextResponse.json({ 
        error: 'Phone number is required' 
      }, { status: 400, headers: corsHeaders });
    }

    // At least one of message or file must be provided
    if (!message && !file) {
      return NextResponse.json({ 
        error: 'Either message text or file is required' 
      }, { status: 400, headers: corsHeaders });
    }

    const userId = user.id;

    // First check if session exists in memory
    let session = await getSession(userId.toString(), false);
    
    // If not connected, try to restore from database and reconnect
    if (!session || !session.connected || !session.sock?.user) {
      console.log(`📡 Attempting to restore session for user ${userId} before sending message...`);
      
      // Try to restore and connect (waitForQR=false means no QR generation, just restore)
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
            } else if (attempts >= 30) { // 30 * 500ms = 15 seconds
              clearInterval(checkInterval);
              resolve(false);
            }
          }, 500);
        });
        
        // Refresh session after waiting
        session = await getSession(userId.toString(), false);
      }
    }
    
    // Final check - if still not connected, return error
    if (!session || !session.connected || !session.sock?.user) {
      return NextResponse.json({ 
        error: 'WhatsApp not connected. Unable to restore session. Please connect via dashboard.',
        needsQR: true 
      }, { status: 400, headers: corsHeaders });
    }

    const formattedNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
    const [result] = await session.sock.onWhatsApp(phoneNumber);

    if (!result?.exists) {
      return NextResponse.json({ 
        error: 'Recipient is not on WhatsApp' 
      }, { status: 400, headers: corsHeaders });
    }

    // Handle three combinations: text only, file only, text + file
    if (file) {
      // File provided (with or without text)
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const tempPath = join(process.cwd(), 'temp', file.name);
      
      // Save file temporarily
      await writeFile(tempPath, buffer);

      try {
        const fileBuffer = readFileSync(tempPath);
        const mimeType = file.type;

        if (mimeType.startsWith('image/')) {
          // Image with optional caption (text)
          await session.sock.sendMessage(result.jid, {
            image: fileBuffer,
            caption: message || undefined, // Caption is optional
          });
        } else if (mimeType.startsWith('video/')) {
          // Video with optional caption (text)
          await session.sock.sendMessage(result.jid, {
            video: fileBuffer,
            caption: message || undefined,
          });
        } else if (mimeType.startsWith('audio/')) {
          // Audio (no caption support in WhatsApp)
          await session.sock.sendMessage(result.jid, {
            audio: fileBuffer,
            mimetype: mimeType,
          });
          // If text provided, send it as separate message
          if (message) {
            await session.sock.sendMessage(result.jid, { text: message });
          }
        } else {
          // Document with optional caption (text)
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
    } else if (message) {
      // Text only (no file)
      await session.sock.sendMessage(result.jid, { text: message });
    }

    // Deduct credit
    await db.update(users).set({ credits: user.credits - 1 }).where(eq(users.id, userId));
    
    // Save message
    await db.insert(messages).values({ 
      userId, 
      message: message || `Sent file: ${file?.name}` 
    });

    // Save or update contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.phoneNumber, phoneNumber)
      ),
    });

    if (!contact) {
      const [newContact] = await db.insert(contacts).values({
        userId,
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
      userId,
      contactId: contact.id,
      phoneNumber,
      message: message || null,
      mediaUrl: file?.name || null,
      mediaType: file?.type || null,
      isFromMe: true,
    });

    return NextResponse.json({ 
      message: 'Message sent successfully', 
      contactId: contact.id,
      remainingCredits: user.credits - 1
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ 
      error: 'Failed to send message. Please try again.' 
    }, { status: 500, headers: corsHeaders });
  }
}
