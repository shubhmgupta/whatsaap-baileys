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
const reconnectAttempts = new Map<string, number>(); // Track reconnection attempts
let isInitialized = false;

// Restore existing sessions on startup
async function initializeSessions() {
  if (isInitialized) return;
  isInitialized = true;
  
  try {
    const sessionsDir = path.join(process.cwd(), 'sessions');
    
    // Check if sessions directory exists
    if (!await fs.pathExists(sessionsDir)) {
      console.log('📁 No existing sessions to restore');
      return;
    }
    
    // Get all session directories
    const userDirs = await fs.readdir(sessionsDir);
    
    for (const dir of userDirs) {
      if (dir.startsWith('user_')) {
        const userId = dir.replace('user_', '');
        const sessionPath = path.join(sessionsDir, dir);
        
        // Check if session has auth credentials
        const credsPath = path.join(sessionPath, 'creds.json');
        if (await fs.pathExists(credsPath)) {
          console.log(`🔄 Restoring WhatsApp session for user ${userId}...`);
          
          // Start session in background
          createBaileysSession(userId).catch(err => {
            console.error(`Failed to restore session for user ${userId}:`, err);
          });
        }
      }
    }
    
    console.log('✅ Session restoration complete');
  } catch (error) {
    console.error('Error initializing sessions:', error);
  }
}

// Initialize sessions on module load
initializeSessions();

// Heartbeat mechanism to keep connections alive
const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

function startHeartbeat(userId: string, sock: any) {
  // Clear existing heartbeat if any
  if (heartbeatIntervals.has(userId)) {
    clearInterval(heartbeatIntervals.get(userId));
  }
  
  // Send a presence update every 30 seconds to keep connection alive
  const interval = setInterval(async () => {
    try {
      if (sock?.user) {
        await sock.sendPresenceUpdate('available');
      }
    } catch (error) {
      // Ignore errors, connection will auto-reconnect if needed
    }
  }, 30000);
  
  heartbeatIntervals.set(userId, interval);
}

function stopHeartbeat(userId: string) {
  if (heartbeatIntervals.has(userId)) {
    clearInterval(heartbeatIntervals.get(userId));
    heartbeatIntervals.delete(userId);
  }
}

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
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000, // Send keepalive every 10 seconds
      qrTimeout: 60000,
      retryRequestDelayMs: 250,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false, // Don't sync full history to reduce load
      markOnlineOnConnect: true,
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
      
      // Stop heartbeat on disconnect
      stopHeartbeat(userId);
      
      if (shouldReconnect) {
        // Handle different disconnect reasons
        if (statusCode === DisconnectReason.connectionReplaced || statusCode === 401) {
          console.log('⚠️ Connection replaced/conflict. Keeping session but requiring new scan.');
          // Don't clear session files, just clear the active connection
          sessions.set(userId, { ...sessions.get(userId), connected: false, sock: null });
          return;
        }

        if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
          console.log(`🔄 Restart required for user ${userId}. Reconnecting with existing session...`);
          // Keep session data, just reconnect
          sessions.set(userId, { ...sessions.get(userId), connected: false });
          
          setTimeout(() => {
            if (!sessions.get(userId)?.connected && !reconnectingUsers.has(userId)) {
              console.log(`🔄 Restarting connection for user ${userId}...`);
              createBaileysSession(userId).catch(err => {
                console.error('Error restarting session:', err);
                reconnectingUsers.delete(userId);
              });
            }
          }, 2000);
          return;
        }

        // For other errors, automatically reconnect
        console.log(`🔄 Auto-reconnecting WhatsApp for user ${userId} in 5 seconds...`);
        sessions.set(userId, { ...sessions.get(userId), connected: false });
        
        setTimeout(() => {
          if (!sessions.get(userId)?.connected && !reconnectingUsers.has(userId)) {
            console.log(`🔄 Attempting reconnection for user ${userId}...`);
            createBaileysSession(userId).catch(err => {
              console.error('Error reconnecting session:', err);
              reconnectingUsers.delete(userId);
            });
          }
        }, 5000);
      } else {
        // Only clear session if user explicitly logged out from WhatsApp
        console.log(`🔌 User ${userId} logged out from WhatsApp`);
        sessions.delete(userId);
        messageStore.delete(userId);
        qrResolvers.delete(userId);
        const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
        await fs.remove(sessionDir).catch(err => console.error('Failed to remove session directory:', err));
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully for user:', userId);
      reconnectingUsers.delete(userId);
      reconnectAttempts.delete(userId); // Reset reconnection attempts on success
      
      try {
        const session = JSON.stringify(state);
        await db.update(users).set({ whatsappSession: session }).where(eq(users.id, parseInt(userId)));
        
        // Update session with all connection details
        sessions.set(userId, { 
          ...sessions.get(userId), 
          sock, 
          connected: true,
          user: sock.user,
          lastConnected: new Date()
        });
        
        // Start heartbeat to keep connection alive
        startHeartbeat(userId, sock);
      } catch (error) {
        console.error('Error updating session in database:', error);
      }
    } else if (connection === 'connecting') {
      console.log('🔄 WhatsApp connecting for user:', userId);
      sessions.set(userId, { ...sessions.get(userId), connecting: true, connected: false });
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
  if (existingSession?.connected && existingSession?.sock?.user) {
    console.log('✅ Using existing connected session for user:', userId);
    return existingSession;
  }
  
  // If session exists but not connected, check if socket is still valid
  if (existingSession?.sock && !existingSession?.connected) {
    console.log('⏳ Session exists but not connected for user:', userId);
    return existingSession;
  }
  
  // Only create new session if none exists
  if (!existingSession || (!existingSession.sock && !reconnectingUsers.has(userId))) {
    console.log('🆕 Creating new session for user:', userId);
    await createBaileysSession(userId);
    
    // Wait for QR code to be generated (up to 30 seconds)
    if (!sessions.get(userId)?.qr && !sessions.get(userId)?.connected) {
      console.log('⏳ Waiting for QR code generation for user:', userId);
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
        
        // Stop heartbeat
        stopHeartbeat(userId);
        
        // Clear session files
        const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
        await fs.remove(sessionDir).catch(err => console.error('Failed to remove session directory:', err));
    }
}

export function getStoredMessages(userId: string, phoneNumber: string) {
  const userKey = `${userId}_${phoneNumber}`;
  return messageStore.get(userKey) || [];
}
