import { NextResponse } from 'next/server';
import { getSession, uploadBufferToCloudinary } from '@/lib/baileys';
import { getUserFromToken, ensureWhatsAppSession } from '@/lib/api-auth';
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

    // Ensure WhatsApp session is connected (auto-restore if needed)
    const sessionCheck = await ensureWhatsAppSession(userId);
    
    if (sessionCheck.status === 'restoring') {
      return NextResponse.json({ 
        error: sessionCheck.message || 'WhatsApp session is being restored',
        status: 'restoring',
        message: 'Please retry in a few seconds'
      }, { status: 503, headers: corsHeaders });
    }
    
    if (sessionCheck.status === 'needs_qr') {
      return NextResponse.json({ 
        error: sessionCheck.message || 'WhatsApp not connected',
        status: 'needs_qr',
        message: 'Please generate QR code at /api/v1/auth/qr first'
      }, { status: 400, headers: corsHeaders });
    }
    
    const session = sessionCheck.session;
    
    if (!session || !session.sock?.user) {
      return NextResponse.json({ 
        error: 'WhatsApp session error. Please reconnect.',
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

        // Try uploading to Cloudinary first so we can save the full URL in DB
        let outgoingMediaUrl: string | null = null;
        try {
          outgoingMediaUrl = await uploadBufferToCloudinary(fileBuffer, mimeType, file.name);
          console.log('   🔗 Outgoing file uploaded to Cloudinary:', outgoingMediaUrl);
        } catch (err) {
          console.error('   ⚠️ Failed to upload outgoing file to Cloudinary:', err);
          outgoingMediaUrl = null;
        }

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

        // Attach outgoingMediaUrl to file variable so we can save it below
        // (we cannot mutate the File object directly in TypeScript runtime, so store separately)
        (file as any)._uploadedUrl = outgoingMediaUrl;
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
    const outgoingMediaUrl = (file as any)?._uploadedUrl ?? null;
    await db.insert(chatMessages).values({
      userId,
      contactId: contact.id,
      phoneNumber,
      message: message || null,
      mediaUrl: outgoingMediaUrl,
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
