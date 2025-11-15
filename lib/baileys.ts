import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import { db } from '@/lib/db';
import { users, contacts, chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';

const sessions = new Map<string, any>();
const messageStore = new Map<string, any[]>(); // Store messages in memory per user
const reconnectingUsers = new Set<string>(); // Track users currently reconnecting
const qrResolvers = new Map<string, any>(); // Store QR promise resolvers

// Global error handlers for unhandled rejections
process.on('unhandledRejection', (reason: any, promise) => {
  // Only log Boom errors, which are common in Baileys and often not critical
  if (reason?.isBoom) {
    console.error(`Baileys non-fatal error: ${reason.message}`);
    return;
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error, origin) => {
  console.error(`Caught exception: ${error}\n` + `Exception origin: ${origin}`);
});

async function createBaileysSession(userId: string) {
  // Prevent duplicate connection attempts
  if (reconnectingUsers.has(userId)) {
    console.log('Connection attempt already in progress for user:', userId);
    return sessions.get(userId);
  }

  try {
    reconnectingUsers.add(userId);
    
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/user_${userId}`);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      version,
      logger: pino({ level: 'silent' }), // Reduce log noise
      browser: ['Codefy', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000, // 60 second timeout
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      qrTimeout: 60000, // QR timeout
      retryRequestDelayMs: 250,
    });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      const qrCode = await qrcode.toDataURL(qr);
      sessions.set(userId, { ...sessions.get(userId), qr: qrCode, sock });
      
      // Resolve any pending QR promises
      const resolver = qrResolvers.get(userId);
      if (resolver) {
        resolver(qrCode);
        qrResolvers.delete(userId);
      }
      console.log('✅ QR code generated for user:', userId);
    }
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed:', lastDisconnect?.error?.message || 'Unknown error', 'Status:', statusCode, ', reconnecting:', shouldReconnect);
      
      // Clean up reconnecting flag
      reconnectingUsers.delete(userId);
      
      if (shouldReconnect) {
        // If it's a conflict, don't reconnect automatically - wait for user to request new QR
        if (statusCode === DisconnectReason.connectionReplaced) {
          console.log('Connection conflict. Clearing session data. User needs to generate new QR.');
          const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
          await fs.remove(sessionDir).catch(err => console.error('Failed to remove session directory:', err));
          sessions.delete(userId); // Clear session completely
          messageStore.delete(userId);
          qrResolvers.delete(userId);
          // Don't reconnect automatically on conflict
          return;
        }

        // For other errors, automatically reconnect (keep WhatsApp connected)
        console.log(`🔄 Auto-reconnecting WhatsApp for user ${userId} in 3 seconds...`);
        setTimeout(() => {
          // Only reconnect if not already connected and not in progress
          if (!sessions.get(userId)?.connected && !reconnectingUsers.has(userId)) {
            console.log(`🔄 Attempting reconnection for user ${userId}...`);
            createBaileysSession(userId).catch(err => {
              console.error('Error reconnecting session:', err);
              reconnectingUsers.delete(userId);
            });
          }
        }, 3000);
      } else {
        // Only clear session if user explicitly logged out from WhatsApp
        console.log(`🔌 User ${userId} logged out from WhatsApp`);
        sessions.delete(userId);
        messageStore.delete(userId);
        qrResolvers.delete(userId);
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully for user:', userId);
      reconnectingUsers.delete(userId); // Clear reconnecting flag on successful connection
      try {
        const session = JSON.stringify(state);
        await db.update(users).set({ whatsappSession: session }).where(eq(users.id, parseInt(userId)));
        sessions.set(userId, { ...sessions.get(userId), sock, connected: true });
      } catch (error) {
        console.error('Error updating session in database:', error);
      }
    }
  });

  sock.ev.on('creds.update', async () => {
    try {
      // Check if session directory still exists before saving
      const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
      const exists = await fs.pathExists(sessionDir);
      if (exists) {
        await saveCreds();
      }
    } catch (error) {
      // Ignore ENOENT errors (file doesn't exist) as session may have been cleared
      if ((error as any).code !== 'ENOENT') {
        console.error('Error saving credentials:', error);
      }
    }
  });

  // Listen for incoming messages (ALL messages, both sent and received)
  sock.ev.on('messages.upsert', async (m) => {
    for (const message of m.messages) {
      try {
        const jid = message.key.remoteJid || '';
        const senderNumber = jid.replace('@s.whatsapp.net', '');
        
        // Store message in memory for syncing
        const userKey = `${userId}_${senderNumber}`;
        if (!messageStore.has(userKey)) {
          messageStore.set(userKey, []);
        }
        const messages = messageStore.get(userKey) || [];
        messages.push(message);
        messageStore.set(userKey, messages);
        
        // Keep only last 100 messages in memory per contact
        if (messages.length > 100) {
          messages.shift();
        }

        // Only save to database if it's an incoming message (not from us)
        if (!message.key.fromMe && message.message) {
          const messageText = message.message.conversation || 
                            message.message.extendedTextMessage?.text || 
                            message.message.imageMessage?.caption ||
                            message.message.videoMessage?.caption ||
                            '';

          // Get or create contact
          let contact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.userId, parseInt(userId)),
              eq(contacts.phoneNumber, senderNumber)
            ),
          });

          if (!contact) {
            const [newContact] = await db.insert(contacts).values({
              userId: parseInt(userId),
              phoneNumber: senderNumber,
              name: senderNumber,
              lastMessageAt: new Date(),
            }).returning();
            contact = newContact;
          } else {
            await db.update(contacts)
              .set({ lastMessageAt: new Date() })
              .where(eq(contacts.id, contact.id));
          }

          // Save the message
          await db.insert(chatMessages).values({
            userId: parseInt(userId),
            contactId: contact.id,
            phoneNumber: senderNumber,
            message: messageText || 'Media message',
            mediaType: message.message.imageMessage ? 'image' : 
                      message.message.videoMessage ? 'video' : 
                      message.message.audioMessage ? 'audio' : 
                      message.message.documentMessage ? 'document' : null,
            isFromMe: false,
          });

          console.log('📨 Received message from:', senderNumber);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  });

  sessions.set(userId, { sock, connected: false });
  return sessions.get(userId);
  } catch (error) {
    console.error('Error creating Baileys session:', error);
    reconnectingUsers.delete(userId);
    throw error;
  } finally {
    reconnectingUsers.delete(userId);
  }
}

export async function getSession(userId: string) {
  const existingSession = sessions.get(userId);
  
  // If already connected, return the session
  if (existingSession?.connected && existingSession?.sock) {
    console.log('Using existing connected session for user:', userId);
    return existingSession;
  }
  
  // If session doesn't exist or socket is closed, create/recreate it
  if (!existingSession || !existingSession?.sock) {
    await createBaileysSession(userId);
    
    // Wait for QR code to be generated (up to 30 seconds)
    if (!sessions.get(userId)?.qr && !sessions.get(userId)?.connected) {
      console.log('Waiting for QR code generation for user:', userId);
      await new Promise((resolve, reject) => {
        qrResolvers.set(userId, resolve);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (qrResolvers.has(userId)) {
            qrResolvers.delete(userId);
            reject(new Error('QR code generation timeout'));
          }
        }, 30000);
      }).catch(err => {
        console.error('QR generation timeout:', err);
      });
    }
  }
  
  return sessions.get(userId);
}

export async function logoutSession(userId: string) {
    const session = sessions.get(userId);
    if (session?.sock) {
        try {
            await session.sock.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        sessions.delete(userId);
        // Clear message store for this user
        const keysToDelete = Array.from(messageStore.keys()).filter(key => key.startsWith(`${userId}_`));
        keysToDelete.forEach(key => messageStore.delete(key));
        reconnectingUsers.delete(userId);
        qrResolvers.delete(userId);
        
        // Clear session files
        const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
        await fs.remove(sessionDir).catch(err => console.error('Failed to remove session directory:', err));
    }
}

export function getStoredMessages(userId: string, phoneNumber: string) {
  const userKey = `${userId}_${phoneNumber}`;
  return messageStore.get(userKey) || [];
}
