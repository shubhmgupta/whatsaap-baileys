import { NextResponse } from 'next/server';
import { getSession, uploadBufferToCloudinary } from '@/lib/baileys';
import { getUserFromToken, ensureWhatsAppSession } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { messages, users, contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    const targetJid = phoneNumber.includes('@') ? phoneNumber : `${cleanNumber}@s.whatsapp.net`;

    let outgoingMediaUrl: string | null = null;

    // Handle three combinations: text only, file only, text + file
    if (file) {
      // File provided (with or without text)
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'application/octet-stream';
      const fileName = file.name || 'document';

      let waPayload: any;
      if (mimeType.startsWith('image/')) {
        waPayload = { image: buffer, caption: message || undefined, mimetype: mimeType };
      } else if (mimeType.startsWith('video/')) {
        waPayload = { video: buffer, caption: message || undefined, mimetype: mimeType };
      } else if (mimeType.startsWith('audio/')) {
        waPayload = { audio: buffer, mimetype: mimeType };
      } else {
        waPayload = { document: buffer, mimetype: mimeType, fileName, caption: message || undefined };
      }

      // Concurrently transmit to WhatsApp and upload to Cloudinary in parallel
      const [waResult, cloudResult] = await Promise.allSettled([
        session.sock.sendMessage(targetJid, waPayload).then(async (res: any) => {
          if (mimeType.startsWith('audio/') && message) {
            await session.sock.sendMessage(targetJid, { text: message });
          }
          return res;
        }),
        uploadBufferToCloudinary(buffer, mimeType, fileName).catch((err) => {
          console.warn('   ⚠️ Cloudinary upload warning (direct WhatsApp delivery still succeeded):', err?.message || err);
          return null;
        })
      ]);

      if (waResult.status === 'rejected') {
        const errorMsg = waResult.reason?.message || 'Failed to deliver message via WhatsApp';
        console.error('WhatsApp dispatch error:', errorMsg);
        return NextResponse.json({ error: errorMsg }, { status: 400, headers: corsHeaders });
      }

      outgoingMediaUrl = cloudResult.status === 'fulfilled' ? cloudResult.value : null;
    } else if (message) {
      // Direct text send
      await session.sock.sendMessage(targetJid, { text: message });
    }

    // Deduct credit & record log concurrently
    const userUpdatePromise = db.update(users).set({ credits: user.credits - 1 }).where(eq(users.id, userId));
    const messageLogPromise = db.insert(messages).values({
      userId,
      message: message || `Sent file: ${file?.name || 'media'}`
    });

    // Save or update contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, userId),
        eq(contacts.phoneNumber, cleanNumber)
      ),
    });

    let contactId: number;
    if (!contact) {
      const [newContact] = await db.insert(contacts).values({
        userId,
        phoneNumber: cleanNumber,
        name: cleanNumber,
        lastMessageAt: new Date(),
      }).$returningId();
      contactId = newContact.id;
    } else {
      contactId = contact.id;
      await db.update(contacts)
        .set({ lastMessageAt: new Date() })
        .where(eq(contacts.id, contact.id));
    }

    // Save chat message
    const chatMessagePromise = db.insert(chatMessages).values({
      userId,
      contactId,
      phoneNumber: cleanNumber,
      message: message || null,
      mediaUrl: outgoingMediaUrl,
      mediaType: file?.type || null,
      isFromMe: true,
    });

    await Promise.all([userUpdatePromise, messageLogPromise, chatMessagePromise]);

    return NextResponse.json({
      message: 'Message sent successfully',
      contactId,
      remainingCredits: user.credits - 1
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({
      error: 'Failed to send message. Please try again.'
    }, { status: 500, headers: corsHeaders });
  }
}
