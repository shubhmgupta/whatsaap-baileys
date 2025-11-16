import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import { db } from '@/lib/db';
import { users, contacts, chatMessages } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Session management - UPDATED with enhanced logging and Status 440 handling
// Use globalThis to ensure single instance across all module imports (fixes Next.js module duplication)
const globalForSessions = globalThis as unknown as {
  sessions: Map<string, any>;
  messageStore: Map<string, any[]>;
  reconnectingUsers: Set<string>;
  qrResolvers: Map<string, any>;
  reconnectAttempts: Map<string, number>;
  heartbeatIntervals: Map<string, NodeJS.Timeout>;
  isInitialized: boolean;
};

const sessions = globalForSessions.sessions ?? (globalForSessions.sessions = new Map<string, any>());
const messageStore = globalForSessions.messageStore ?? (globalForSessions.messageStore = new Map<string, any[]>());
const reconnectingUsers = globalForSessions.reconnectingUsers ?? (globalForSessions.reconnectingUsers = new Set<string>());
const qrResolvers = globalForSessions.qrResolvers ?? (globalForSessions.qrResolvers = new Map<string, any>());
const reconnectAttempts = globalForSessions.reconnectAttempts ?? (globalForSessions.reconnectAttempts = new Map<string, number>());
let isInitialized = globalForSessions.isInitialized ?? false;

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

// DON'T auto-initialize on module load - causes conflicts
// Sessions will be created on-demand when needed
// initializeSessions();

// Heartbeat mechanism to keep connections alive - also use global storage
const heartbeatIntervals = globalForSessions.heartbeatIntervals ?? (globalForSessions.heartbeatIntervals = new Map<string, NodeJS.Timeout>());

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
// Increase max listeners to prevent warnings
process.setMaxListeners(20);

const rejectionHandler = (reason: any, promise: Promise<any>) => {
  // Only log Boom errors, which are common in Baileys and often not critical
  if (reason?.isBoom) {
    console.error(`Baileys non-fatal error: ${reason.message}`);
    return;
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
};

// Remove existing handler if any to prevent duplicates
process.removeListener('unhandledRejection', rejectionHandler);
process.on('unhandledRejection', rejectionHandler);

process.on('uncaughtException', (error: Error, origin) => {
  console.error(`Caught exception: ${error}\n` + `Exception origin: ${origin}`);
});

// Clean up session files for inactive users to save disk space
// Files are removed after 30 days, but users can still reconnect from DB
async function cleanupInactiveSessions() {
  try {
    const sessionsDir = path.join(process.cwd(), 'sessions');
    if (!await fs.pathExists(sessionsDir)) return;
    
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000); // Extended to 30 days
    
    const userDirs = await fs.readdir(sessionsDir);
    let cleaned = 0;
    
    for (const dir of userDirs) {
      if (!dir.startsWith('user_')) continue;
      
      const userId = dir.replace('user_', '');
      const sessionPath = path.join(sessionsDir, dir);
      
      // Skip if session is active in memory
      const activeSession = sessions.get(userId);
      if (activeSession?.connected) continue;
      
      // Check last modified time
      const stats = await fs.stat(sessionPath);
      if (stats.mtimeMs < thirtyDaysAgo) {
        // Session hasn't been used in 30 days, remove it (DB backup exists)
        await fs.remove(sessionPath);
        cleaned++;
        console.log(`🧹 Cleaned up inactive session files for user ${userId} (DB backup available)`);
      }
    }
    
    if (cleaned > 0) {
      console.log(`✅ Cleaned up ${cleaned} inactive session folders (users can still auto-reconnect from DB)`);
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}

// Helper function to restore session auth state from database
async function restoreSessionFromDatabase(userId: string): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(userId))
    });
    
    if (!user?.whatsappSession) {
      console.log(`❌ No saved session found in DB for user ${userId}`);
      return false;
    }
    
    // Parse saved session data
    const savedState = JSON.parse(user.whatsappSession);
    
    // Create session directory if it doesn't exist
    const sessionPath = path.join(process.cwd(), `sessions/user_${userId}`);
    await fs.ensureDir(sessionPath);
    
    // Write creds.json (main auth file)
    if (savedState.creds) {
      await fs.writeJson(path.join(sessionPath, 'creds.json'), savedState.creds);
    }
    
    // Write keys if they exist
    if (savedState.keys) {
      await fs.writeJson(path.join(sessionPath, 'keys.json'), savedState.keys);
    }
    
    console.log(`✅ Restored session from database for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error restoring session from DB for user ${userId}:`, error);
    return false;
  }
}

// Run cleanup every 6 hours
setInterval(cleanupInactiveSessions, 6 * 60 * 60 * 1000);
// Run immediately on startup
cleanupInactiveSessions();

async function createBaileysSession(userId: string) {
  // Prevent duplicate connection attempts
  if (reconnectingUsers.has(userId)) {
    console.log('⚠️ Connection attempt already in progress for user:', userId);
    return sessions.get(userId);
  }

  // Check if already connected
  const existingSession = sessions.get(userId);
  if (existingSession?.sock?.user) {
    console.log('✅ Using existing active session for user:', userId);
    return existingSession;
  }

  try {
    reconnectingUsers.add(userId);
    
    // Check if session files exist, if not try to restore from database
    const sessionPath = path.join(process.cwd(), `sessions/user_${userId}`);
    const credsPath = path.join(sessionPath, 'creds.json');
    
    if (!await fs.pathExists(credsPath)) {
      console.log(`📂 Session files not found for user ${userId}, checking database...`);
      const restored = await restoreSessionFromDatabase(userId);
      
      if (!restored) {
        console.log(`⚠️ No session backup in database for user ${userId}, needs fresh QR scan`);
        // Continue anyway - will generate new QR code
      }
    }
    
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
        if (statusCode === DisconnectReason.connectionReplaced || statusCode === 401 || statusCode === 440) {
          console.log('⚠️ Connection replaced/conflict (Status 440/401). This means WhatsApp is open elsewhere.');
          
          // Keep a minimal session object so future updates can find it
          // This prevents ghost updates from failing
          const currentSession = sessions.get(userId);
          
          sessions.set(userId, {
            connected: false,
            sock: null,
            needsQR: true,
            lastDisconnect: new Date(),
            qr: currentSession?.qr // Preserve QR if it exists
          });
          
          stopHeartbeat(userId);
          reconnectingUsers.delete(userId);
          reconnectAttempts.delete(userId);
          
          console.log('🧹 Session marked disconnected. User must scan QR code again.');
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

        // For other errors, automatically reconnect with backoff
        const attempts = reconnectAttempts.get(userId) || 0;
        if (attempts >= 5) {
          console.log(`❌ Max reconnection attempts reached for user ${userId}. Stopping.`);
          sessions.set(userId, { ...sessions.get(userId), connected: false, sock: null });
          reconnectAttempts.delete(userId);
          return;
        }
        
        reconnectAttempts.set(userId, attempts + 1);
        const delay = Math.min(5000 * Math.pow(2, attempts), 60000); // Exponential backoff, max 60s
        
        console.log(`🔄 Auto-reconnecting WhatsApp for user ${userId} in ${delay/1000} seconds (attempt ${attempts + 1}/5)...`);
        sessions.set(userId, { ...sessions.get(userId), connected: false });
        
        setTimeout(() => {
          if (!sessions.get(userId)?.connected && !reconnectingUsers.has(userId)) {
            console.log(`🔄 Attempting reconnection for user ${userId}...`);
            createBaileysSession(userId).catch(err => {
              console.error('Error reconnecting session:', err);
              reconnectingUsers.delete(userId);
            });
          }
        }, delay);
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
        // Save minimal session data to database (just auth state, not full session)
        const sessionData = JSON.stringify(state);
        await db.update(users).set({ 
          whatsappSession: sessionData,
          // Note: In production, consider using jsonb column for better performance
        }).where(eq(users.id, parseInt(userId)));
        
        // Update in-memory session with all connection details
        sessions.set(userId, { 
          ...sessions.get(userId), 
          sock, 
          connected: true,
          user: sock.user,
          lastConnected: new Date()
        });
        
        // Start heartbeat to keep connection alive
        startHeartbeat(userId, sock);
        
        console.log(`💾 Session saved to database for user ${userId}`);
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
        
        // STRICT FILTER: Only process individual chat messages (ending with @s.whatsapp.net)
        // Skip ALL of these:
        // - status@broadcast (WhatsApp Status updates)
        // - @g.us (Group messages)
        // - @broadcast (Broadcast lists)
        // - @newsletter (Newsletter/Channel messages)
        if (!jid.endsWith('@s.whatsapp.net')) {
          continue;
        }
        
        const senderNumber = jid.replace('@s.whatsapp.net', '');
        
        // Additional safety check: Skip if phone number looks invalid
        if (!senderNumber || senderNumber.includes('@') || senderNumber.includes('broadcast') || senderNumber.includes('status')) {
          continue;
        }
        
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

          // Try to get contact name from WhatsApp
          let contactName = senderNumber;
          try {
            const pushName = message.pushName || null;
            const verifiedName = message.verifiedBizName || null;
            contactName = verifiedName || pushName || senderNumber;
          } catch (error) {
            console.error('Error getting contact name:', error);
          }

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
              name: contactName,
              lastMessageAt: new Date(),
            }).returning();
            contact = newContact;
          } else {
            // Update contact name if we got a better one and last message time
            await db.update(contacts)
              .set({ 
                name: contactName !== senderNumber ? contactName : contact.name,
                lastMessageAt: new Date() 
              })
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

export async function getSession(userId: string, waitForQR: boolean = false) {
  const existingSession = sessions.get(userId);
  
  // 1. If fully connected with valid user, return immediately
  if (existingSession?.connected && existingSession?.sock?.user) {
    console.log('✅ Using existing connected session for user:', userId);
    return existingSession;
  }
  
  // 2. If actively connecting/reconnecting, return the session (DON'T clear it!)
  if (reconnectingUsers.has(userId)) {
    console.log('⚠️ Connection attempt already in progress for user:', userId);
    return existingSession || null;
  }
  
  // 3. If session has socket but no user yet, it's still establishing connection
  if (existingSession?.sock && !existingSession?.sock?.user) {
    console.log('⏳ Session connecting for user:', userId);
    return existingSession; // Don't clear, let it finish connecting
  }
  
  // 4. If just checking status (waitForQR=false), return what exists even if partial
  if (!waitForQR) {
    return existingSession || null;
  }
  
  // 5. Only clear if session is truly dead AND we're about to create new one
  if (existingSession && !existingSession?.sock && !existingSession?.connected && waitForQR) {
    console.log('🧹 Clearing dead session for user:', userId);
    sessions.delete(userId);
    stopHeartbeat(userId);
  }
  
  // 6. Only create new session if explicitly waiting for QR (user initiated)
  if (!sessions.get(userId) && !reconnectingUsers.has(userId) && waitForQR) {
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
  
  return sessions.get(userId) || null;
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

export async function clearSession(userId: string) {
  console.log(`🧹 Force clearing session for user ${userId}...`);
  
  // Stop heartbeat
  stopHeartbeat(userId);
  
  // Remove from tracking sets
  reconnectingUsers.delete(userId);
  qrResolvers.delete(userId);
  reconnectAttempts.delete(userId);
  
  // Clear session from memory
  sessions.delete(userId);
  
  // Clear message store
  const keysToDelete = Array.from(messageStore.keys()).filter(key => key.startsWith(`${userId}_`));
  keysToDelete.forEach(key => messageStore.delete(key));
  
  console.log(`✅ Session cleared for user ${userId}`);
}

export function getStoredMessages(userId: string, phoneNumber: string) {
  const userKey = `${userId}_${phoneNumber}`;
  return messageStore.get(userKey) || [];
}
