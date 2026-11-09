import { NextResponse } from 'next/server';
import { getSession, uploadBufferToCloudinary } from '@/lib/baileys';
import { db } from '@/lib/db';
import { messages, users, apiTokens, contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    const targetJid = phoneNumber.includes('@') ? phoneNumber : `${cleanNumber}@s.whatsapp.net`;

    let outgoingMediaUrl: string | null = null;

    // Send message with or without file
    if (file) {
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

      // Concurrently transmit to WhatsApp and upload to Cloudinary (no sequential blocking!)
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
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      outgoingMediaUrl = cloudResult.status === 'fulfilled' ? cloudResult.value : null;
    } else {
      // Direct text send
      await session.sock.sendMessage(targetJid, { text: message });
    }

    // Run credit update and logging in parallel
    const userUpdatePromise = db.update(users).set({ credits: user.credits - 1 }).where(eq(users.id, user.id));
    const messageLogPromise = db.insert(messages).values({
      userId: user.id,
      message: message || `Sent file: ${file?.name || 'media'}`
    });

    // Save or update contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.userId, user.id),
        eq(contacts.phoneNumber, cleanNumber)
      ),
    });

    let contactId: number;
    if (!contact) {
      const [newContact] = await db.insert(contacts).values({
        userId: user.id,
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

    // Save chat message history
    const chatMessagePromise = db.insert(chatMessages).values({
      userId: user.id,
      contactId,
      phoneNumber: cleanNumber,
      message: message || null,
      mediaUrl: outgoingMediaUrl,
      mediaType: file?.type || null,
      isFromMe: true,
      timestamp: new Date(),
    });

    await Promise.all([userUpdatePromise, messageLogPromise, chatMessagePromise]);

    return NextResponse.json({ message: 'Message sent successfully', contactId });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
