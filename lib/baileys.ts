import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { db } from "@/lib/db";
import { users, contacts, chatMessages } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import pino from "pino";
import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { v2 as cloudinary } from "cloudinary";

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

const sessions =
  globalForSessions.sessions ??
  (globalForSessions.sessions = new Map<string, any>());
const messageStore =
  globalForSessions.messageStore ??
  (globalForSessions.messageStore = new Map<string, any[]>());
const reconnectingUsers =
  globalForSessions.reconnectingUsers ??
  (globalForSessions.reconnectingUsers = new Set<string>());
const qrResolvers =
  globalForSessions.qrResolvers ??
  (globalForSessions.qrResolvers = new Map<string, any>());
const reconnectAttempts =
  globalForSessions.reconnectAttempts ??
  (globalForSessions.reconnectAttempts = new Map<string, number>());
let isInitialized = globalForSessions.isInitialized ?? false;

// Restore existing sessions on startup
async function initializeSessions() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const sessionsDir = path.join(process.cwd(), "sessions");

    // Check if sessions directory exists
    if (!(await fs.pathExists(sessionsDir))) {
      console.log("📁 No existing sessions to restore");
      return;
    }

    // Get all session directories
    const userDirs = await fs.readdir(sessionsDir);

    for (const dir of userDirs) {
      if (dir.startsWith("user_")) {
        const userId = dir.replace("user_", "");
        const sessionPath = path.join(sessionsDir, dir);

        // Check if session has auth credentials
        const credsPath = path.join(sessionPath, "creds.json");
        if (await fs.pathExists(credsPath)) {
          console.log(`🔄 Restoring WhatsApp session for user ${userId}...`);

          // Start session in background
          createBaileysSession(userId).catch((err) => {
            console.error(`Failed to restore session for user ${userId}:`, err);
          });
        }
      }
    }

    console.log("✅ Session restoration complete");
  } catch (error) {
    console.error("Error initializing sessions:", error);
  }
}

// DON'T auto-initialize on module load - causes conflicts
// Sessions will be created on-demand when needed
// initializeSessions();

// Heartbeat mechanism to keep connections alive - also use global storage
const heartbeatIntervals =
  globalForSessions.heartbeatIntervals ??
  (globalForSessions.heartbeatIntervals = new Map<string, NodeJS.Timeout>());

function startHeartbeat(userId: string, sock: any) {
  // Clear existing heartbeat if any
  if (heartbeatIntervals.has(userId)) {
    clearInterval(heartbeatIntervals.get(userId));
  }

  // Send a presence update every 30 seconds to keep connection alive
  const interval = setInterval(async () => {
    try {
      if (sock?.user) {
        await sock.sendPresenceUpdate("available");
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
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
};

// Remove existing handler if any to prevent duplicates
process.removeListener("unhandledRejection", rejectionHandler);
process.on("unhandledRejection", rejectionHandler);

process.on("uncaughtException", (error: Error, origin) => {
  console.error(`Caught exception: ${error}\n` + `Exception origin: ${origin}`);
});

// Clean up session files for inactive users to save disk space
// Files are removed after 30 days, but users can still reconnect from DB
async function cleanupInactiveSessions() {
  try {
    const sessionsDir = path.join(process.cwd(), "sessions");
    if (!(await fs.pathExists(sessionsDir))) return;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000; // Extended to 30 days

    const userDirs = await fs.readdir(sessionsDir);
    let cleaned = 0;

    for (const dir of userDirs) {
      if (!dir.startsWith("user_")) continue;

      const userId = dir.replace("user_", "");
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
        console.log(
          `🧹 Cleaned up inactive session files for user ${userId} (DB backup available)`
        );
      }
    }

    if (cleaned > 0) {
      console.log(
        `✅ Cleaned up ${cleaned} inactive session folders (users can still auto-reconnect from DB)`
      );
    }
  } catch (error) {
    console.error("Error cleaning up sessions:", error);
  }
}

// Helper function to check if session exists in database
async function getSessionFromDatabase(userId: string): Promise<any | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(userId)),
    });

    if (!user?.whatsappSession) {
      console.log(`❌ No saved session found in DB for user ${userId}`);
      return null;
    }

    // Parse and return saved session data
    const savedState = JSON.parse(user.whatsappSession);
    console.log(`✅ Found session in database for user ${userId}`);
    return savedState;
  } catch (error) {
    console.error(`Error fetching session from DB for user ${userId}:`, error);
    return null;
  }
}

// Helper function to write auth state to disk from database backup
async function restoreSessionFilesFromState(
  userId: string,
  savedState: any
): Promise<void> {
  try {
    const sessionPath = path.join(process.cwd(), `sessions/user_${userId}`);
    await fs.ensureDir(sessionPath);

    // Write creds.json (main auth file)
    if (savedState.creds) {
      await fs.writeJson(
        path.join(sessionPath, "creds.json"),
        savedState.creds
      );
    }

    // Write keys if they exist
    if (savedState.keys) {
      await fs.writeJson(path.join(sessionPath, "keys.json"), savedState.keys);
    }

    console.log(`✅ Restored session files from database for user ${userId}`);
  } catch (error) {
    console.error(`Error restoring session files for user ${userId}:`, error);
    throw error;
  }
}

// Try to restore session from database if backup exists. Returns session or null.
export async function tryRestoreFromDatabase(
  userId: string
): Promise<any | null> {
  try {
    const dbState = await getSessionFromDatabase(userId);
    if (!dbState) return null;

    const sessionPath = path.join(process.cwd(), `sessions/user_${userId}`);
    const credsPath = path.join(sessionPath, "creds.json");

    // Restore files if missing
    if (!(await fs.pathExists(credsPath))) {
      await restoreSessionFilesFromState(userId, dbState);
      console.log(
        `💾 Restored session files from DB for user ${userId} (auto-restore)`
      );
    } else {
      console.log(`📁 Session files already exist for user ${userId}`);
    }

    // If already connected in-memory, return it
    const existing = sessions.get(userId);
    if (existing?.connected && existing?.sock?.user) return existing;

    // Create socket and attempt connection
    await createBaileysSession(userId);

    // Wait up to 10 seconds for connection
    const session = await new Promise<any>((resolve) => {
      let attempts = 0;
      const iv = setInterval(() => {
        const s = sessions.get(userId);
        attempts++;
        if (s?.connected) {
          clearInterval(iv);
          resolve(s);
        } else if (attempts >= 20) {
          // 20 * 500ms = 10s
          clearInterval(iv);
          resolve(s || null);
        }
      }, 500);
    });

    return session;
  } catch (error) {
    console.error("Error in tryRestoreFromDatabase:", error);
    return null;
  }
}

// Run cleanup every 6 hours
setInterval(cleanupInactiveSessions, 6 * 60 * 60 * 1000);
// Run immediately on startup
cleanupInactiveSessions();

async function createBaileysSession(userId: string) {
  // Prevent duplicate connection attempts
  if (reconnectingUsers.has(userId)) {
    console.log("⚠️ Connection attempt already in progress for user:", userId);
    return sessions.get(userId);
  }

  // Check if already connected
  const existingSession = sessions.get(userId);
  if (existingSession?.sock?.user) {
    console.log("✅ Using existing active session for user:", userId);
    return existingSession;
  }

  try {
    reconnectingUsers.add(userId);

    // STEP 1: Check if session files exist on disk
    const sessionPath = path.join(process.cwd(), `sessions/user_${userId}`);
    const credsPath = path.join(sessionPath, "creds.json");
    const hasLocalFiles = await fs.pathExists(credsPath);

    // STEP 2: If no local files, check database and restore
    if (!hasLocalFiles) {
      console.log(
        `📂 Session files not found for user ${userId}, checking database...`
      );
      const dbState = await getSessionFromDatabase(userId);

      if (dbState) {
        console.log(`💾 Restoring session from database for user ${userId}...`);
        await restoreSessionFilesFromState(userId, dbState);
        console.log(`✅ Session restored successfully, connecting...`);
      } else {
        console.log(
          `⚠️ No session backup in database for user ${userId}, will generate QR code`
        );
      }
    } else {
      console.log(`📁 Using existing session files for user ${userId}`);
    }

    // STEP 3: Load auth state (either existing or restored)
    const { state, saveCreds } = await useMultiFileAuthState(
      `sessions/user_${userId}`
    );
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      version,
      logger: pino({ level: "silent" }), // Reduce log noise
      browser: ["Codefy", "Chrome", "120.0.0"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000, // Send keepalive every 10 seconds
      qrTimeout: 60000,
      retryRequestDelayMs: 250,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false, // Don't sync full history to reduce load
      markOnlineOnConnect: true,
    });

    sock.ev.on("connection.update", async (update) => {
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
        console.log("✅ QR code generated for user:", userId);
      }
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(
          "Connection closed:",
          lastDisconnect?.error?.message || "Unknown error",
          "Status:",
          statusCode,
          ", reconnecting:",
          shouldReconnect
        );

        // Clean up reconnecting flag
        reconnectingUsers.delete(userId);

        // Stop heartbeat on disconnect
        stopHeartbeat(userId);

        if (shouldReconnect) {
          // Handle different disconnect reasons
          if (
            statusCode === DisconnectReason.connectionReplaced ||
            statusCode === 401 ||
            statusCode === 440
          ) {
            console.log(
              "⚠️ Connection replaced/conflict (Status 440/401). Invalid credentials - clearing session."
            );

            // Clear session completely to force new QR generation
            sessions.delete(userId);
            messageStore.delete(userId);
            qrResolvers.delete(userId);

            stopHeartbeat(userId);
            reconnectingUsers.delete(userId);
            reconnectAttempts.delete(userId);

            // Clear session files and database async (non-blocking)
            (async () => {
              try {
                const sessionDir = path.join(
                  process.cwd(),
                  `sessions/user_${userId}`
                );
                await fs.remove(sessionDir);
                console.log(`🗑️ Session files deleted for user ${userId}`);
              } catch (err) {
                console.error("Failed to remove session directory:", err);
              }

              try {
                await db
                  .update(users)
                  .set({
                    whatsappSession: null,
                  })
                  .where(eq(users.id, parseInt(userId)));
                console.log(
                  `🗑️ Database session backup cleared for user ${userId}`
                );
              } catch (error) {
                console.error("Failed to clear database session:", error);
              }
            })();

            console.log(
              "🧹 Session completely cleared. User must scan new QR code."
            );
            return;
          }

          if (
            statusCode === DisconnectReason.restartRequired ||
            statusCode === 515
          ) {
            console.log(
              `🔄 Restart required for user ${userId}. Reconnecting with existing session...`
            );
            // Keep session data, just reconnect
            sessions.set(userId, { ...sessions.get(userId), connected: false });

            setTimeout(() => {
              if (
                !sessions.get(userId)?.connected &&
                !reconnectingUsers.has(userId)
              ) {
                console.log(`🔄 Restarting connection for user ${userId}...`);
                createBaileysSession(userId).catch((err) => {
                  console.error("Error restarting session:", err);
                  reconnectingUsers.delete(userId);
                });
              }
            }, 2000);
            return;
          }

          // For other errors, automatically reconnect with backoff
          const attempts = reconnectAttempts.get(userId) || 0;
          if (attempts >= 5) {
            console.log(
              `❌ Max reconnection attempts reached for user ${userId}. Stopping.`
            );
            sessions.set(userId, {
              ...sessions.get(userId),
              connected: false,
              sock: null,
            });
            reconnectAttempts.delete(userId);
            return;
          }

          reconnectAttempts.set(userId, attempts + 1);
          const delay = Math.min(5000 * Math.pow(2, attempts), 60000); // Exponential backoff, max 60s

          console.log(
            `🔄 Auto-reconnecting WhatsApp for user ${userId} in ${
              delay / 1000
            } seconds (attempt ${attempts + 1}/5)...`
          );
          sessions.set(userId, { ...sessions.get(userId), connected: false });

          setTimeout(() => {
            if (
              !sessions.get(userId)?.connected &&
              !reconnectingUsers.has(userId)
            ) {
              console.log(`🔄 Attempting reconnection for user ${userId}...`);
              createBaileysSession(userId).catch((err) => {
                console.error("Error reconnecting session:", err);
                reconnectingUsers.delete(userId);
              });
            }
          }, delay);
        } else {
          // User explicitly logged out from WhatsApp (Status 401)
          console.log(
            `🔌 User ${userId} logged out from WhatsApp - clearing all session data`
          );

          // Clear in-memory session
          sessions.delete(userId);
          messageStore.delete(userId);
          qrResolvers.delete(userId);

          // Clear session files
          const sessionDir = path.join(
            process.cwd(),
            `sessions/user_${userId}`
          );
          await fs
            .remove(sessionDir)
            .catch((err) =>
              console.error("Failed to remove session directory:", err)
            );

          // IMPORTANT: Clear database backup so we generate fresh QR on reconnect
          try {
            await db
              .update(users)
              .set({
                whatsappSession: null,
              })
              .where(eq(users.id, parseInt(userId)));
            console.log(
              `🗑️ Database session backup cleared for user ${userId}`
            );
          } catch (error) {
            console.error("Failed to clear database session:", error);
          }
        }
      } else if (connection === "open") {
        console.log("✅ WhatsApp connected successfully for user:", userId);
        reconnectingUsers.delete(userId);
        reconnectAttempts.delete(userId); // Reset reconnection attempts on success

        try {
          // Save minimal session data to database (just auth state, not full session)
          const sessionData = JSON.stringify(state);
          await db
            .update(users)
            .set({
              whatsappSession: sessionData,
              // Note: In production, consider using jsonb column for better performance
            })
            .where(eq(users.id, parseInt(userId)));

          // Update in-memory session with all connection details
          sessions.set(userId, {
            ...sessions.get(userId),
            sock,
            connected: true,
            connecting: false, // Clear connecting flag
            user: sock.user,
            lastConnected: new Date(),
          });

          // Start heartbeat to keep connection alive
          startHeartbeat(userId, sock);

          console.log(`💾 Session saved to database for user ${userId}`);
        } catch (error) {
          console.error("Error updating session in database:", error);
        }
      } else if (connection === "connecting") {
        console.log("🔄 WhatsApp connecting for user:", userId);
        sessions.set(userId, {
          ...sessions.get(userId),
          connecting: true,
          connected: false,
        });
      }
    });

    sock.ev.on("creds.update", async () => {
      try {
        // Check if session directory still exists before saving
        const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
        const exists = await fs.pathExists(sessionDir);
        if (exists) {
          await saveCreds();
        }
      } catch (error) {
        // Ignore ENOENT errors (file doesn't exist) as session may have been cleared
        if ((error as any).code !== "ENOENT") {
          console.error("Error saving credentials:", error);
        }
      }
    });

    // Listen for incoming messages (ALL messages, both sent and received)
    sock.ev.on("messages.upsert", async (m) => {
      for (const message of m.messages) {
        try {
          const jid = message.key.remoteJid || "";

          // STRICT FILTER: Only process individual chat messages (ending with @s.whatsapp.net)
          // Skip ALL of these:
          // - status@broadcast (WhatsApp Status updates)
          // - @g.us (Group messages)
          // - @broadcast (Broadcast lists)
          // - @newsletter (Newsletter/Channel messages)
          if (!jid.endsWith("@s.whatsapp.net")) {
            continue;
          }

          const senderNumber = jid.replace("@s.whatsapp.net", "");

          // Additional safety check: Skip if phone number looks invalid
          if (
            !senderNumber ||
            senderNumber.includes("@") ||
            senderNumber.includes("broadcast") ||
            senderNumber.includes("status")
          ) {
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
            console.log('\n' + '='.repeat(80));
            console.log('📨 INCOMING MESSAGE RECEIVED');
            console.log('='.repeat(80));
            console.log('👤 From:', senderNumber);
            console.log('🔑 Message Key:', JSON.stringify(message.key, null, 2));
            console.log('📱 Push Name:', message.pushName);
            console.log('✅ Verified Biz Name:', message.verifiedBizName);
            
            // Safe timestamp parsing
            const timestamp = message.messageTimestamp 
              ? (typeof message.messageTimestamp === 'string' 
                  ? parseInt(message.messageTimestamp) 
                  : Number(message.messageTimestamp)) * 1000
              : Date.now();
            console.log('⏰ Timestamp:', new Date(timestamp).toISOString());
            
            console.log('📨 Full Message Object:', JSON.stringify(message.message, null, 2));
            console.log('='.repeat(80) + '\n');

            const messageText =
              message.message.conversation ||
              message.message.extendedTextMessage?.text ||
              message.message.imageMessage?.caption ||
              message.message.videoMessage?.caption ||
              "";

            // Try to get contact name from WhatsApp
            let contactName = senderNumber;
            try {
              const pushName = message.pushName || null;
              const verifiedName = message.verifiedBizName || null;
              contactName = verifiedName || pushName || senderNumber;
            } catch (error) {
              console.error("Error getting contact name:", error);
            }

            // Determine media type and URL from WhatsApp
            let mediaType = null;
            let mediaUrl = null;

            console.log('\n' + '='.repeat(80));
            console.log('🔍 CHECKING FOR MEDIA IN MESSAGE');
            console.log('='.repeat(80));
            console.log('Has imageMessage?', !!message.message.imageMessage);
            console.log('Has videoMessage?', !!message.message.videoMessage);
            console.log('Has audioMessage?', !!message.message.audioMessage);
            console.log('Has documentMessage?', !!message.message.documentMessage);
            console.log('='.repeat(80) + '\n');

            if (message.message.imageMessage) {
              mediaType = message.message.imageMessage.mimetype || "image/jpeg";
              console.log('📷 IMAGE MESSAGE DETECTED');
              console.log('   - MIME Type:', mediaType);
              console.log('   - Caption:', message.message.imageMessage.caption || 'none');
              console.log('   - Image Message Keys:', Object.keys(message.message.imageMessage));
              
              try {
                console.log('   - Starting download...');
                // Download the media from WhatsApp using downloadContentFromMessage
                const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
                const chunks = [];
                
                console.log('   - Stream created, reading chunks...');
                for await (const chunk of stream) {
                  chunks.push(chunk);
                  console.log('   - Chunk received:', chunk.length, 'bytes');
                }
                
                const buffer = Buffer.concat(chunks);
                console.log('   - Download complete. Buffer size:', buffer.length, 'bytes');
                
                if (buffer.length === 0) {
                  throw new Error('Downloaded buffer is empty');
                }
                
                const ext = mediaType.split('/')[1] || 'jpg';
                const fileName = `image_${Date.now()}.${ext}`;
                
                // Ensure uploads directory exists
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                console.log('   - Uploads dir:', uploadsDir);
                await fs.ensureDir(uploadsDir);
                
                // Save the file
                const filePath = path.join(uploadsDir, fileName);
                console.log('   - Saving to:', filePath);
                await fs.writeFile(filePath, buffer);
                
                // Verify file was saved
                const fileExists = await fs.pathExists(filePath);
                console.log('   - File exists after save:', fileExists);
                
                // Local fallback URL
                const localUrl = `/uploads/${fileName}`;
                mediaUrl = localUrl;
                console.log('   ✅ Image saved locally:', mediaUrl);
                console.log('   - Full path:', filePath);

                // Attempt Cloudinary upload when configured
                if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_CLOUD_NAME) {
                  try {
                    cloudinary.config({
                      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                      api_key: process.env.CLOUDINARY_API_KEY,
                      api_secret: process.env.CLOUDINARY_API_SECRET,
                    });
                    const dataUri = `data:${mediaType};base64,${buffer.toString('base64')}`;
                    const uploadRes = await cloudinary.uploader.upload(dataUri, {
                      folder: process.env.CLOUDINARY_FOLDER || 'whatsapp-automation',
                      public_id: path.parse(fileName).name,
                      resource_type: 'auto',
                    });
                    if (uploadRes?.secure_url) {
                      mediaUrl = uploadRes.secure_url;
                      console.log('   🔗 Uploaded to Cloudinary:', mediaUrl);
                    } else {
                      console.log('   ⚠️ Cloudinary upload did not return secure_url, keeping local path');
                    }
                  } catch (err) {
                    console.error('   ⚠️ Cloudinary upload failed:', err);
                    mediaUrl = localUrl;
                  }
                }
              } catch (error: any) {
                console.error("   ❌ Error downloading image:");
                console.error("   - Error type:", error?.constructor?.name);
                console.error("   - Error message:", error?.message);
                console.error("   - Full error:", error);
                mediaUrl = null;
              }
            } else if (message.message.videoMessage) {
              mediaType = message.message.videoMessage.mimetype || "video/mp4";
              console.log('🎥 VIDEO MESSAGE DETECTED');
              console.log('   - MIME Type:', mediaType);
              console.log('   - Caption:', message.message.videoMessage.caption || 'none');
              
              try {
                console.log('   - Starting download...');
                const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
                const chunks = [];
                
                for await (const chunk of stream) {
                  chunks.push(chunk);
                }
                
                const buffer = Buffer.concat(chunks);
                console.log('   - Download complete. Buffer size:', buffer.length, 'bytes');
                
                const ext = mediaType.split('/')[1] || 'mp4';
                const fileName = `video_${Date.now()}.${ext}`;
                
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                await fs.ensureDir(uploadsDir);
                
                const filePath = path.join(uploadsDir, fileName);
                await fs.writeFile(filePath, buffer);
                
                const localUrl = `/uploads/${fileName}`;
                mediaUrl = localUrl;
                console.log('   ✅ Video saved locally:', mediaUrl);
                console.log('   - Full path:', filePath);

                if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_CLOUD_NAME) {
                  try {
                    cloudinary.config({
                      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                      api_key: process.env.CLOUDINARY_API_KEY,
                      api_secret: process.env.CLOUDINARY_API_SECRET,
                    });
                    const dataUri = `data:${mediaType};base64,${buffer.toString('base64')}`;
                    const uploadRes = await cloudinary.uploader.upload(dataUri, {
                      folder: process.env.CLOUDINARY_FOLDER || 'whatsapp-automation',
                      public_id: path.parse(fileName).name,
                      resource_type: 'auto',
                    });
                    if (uploadRes?.secure_url) {
                      mediaUrl = uploadRes.secure_url;
                      console.log('   🔗 Uploaded video to Cloudinary:', mediaUrl);
                    }
                  } catch (err) {
                    console.error('   ⚠️ Cloudinary upload failed for video:', err);
                    mediaUrl = localUrl;
                  }
                }
              } catch (error: any) {
                console.error("   ❌ Error downloading video:");
                console.error("   - Error type:", error?.constructor?.name);
                console.error("   - Error message:", error?.message);
                console.error("   - Full error:", error);
                mediaUrl = null;
              }
              
            } else if (message.message.audioMessage) {
              mediaType = message.message.audioMessage.mimetype || "audio/ogg";
              console.log('🎵 AUDIO MESSAGE DETECTED');
              console.log('   - MIME Type:', mediaType);
              
              try {
                console.log('   - Starting download...');
                const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
                const chunks = [];
                
                for await (const chunk of stream) {
                  chunks.push(chunk);
                }
                
                const buffer = Buffer.concat(chunks);
                console.log('   - Download complete. Buffer size:', buffer.length, 'bytes');
                
                const ext = mediaType.split('/')[1] || 'ogg';
                const fileName = `audio_${Date.now()}.${ext}`;
                
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                await fs.ensureDir(uploadsDir);
                
                const filePath = path.join(uploadsDir, fileName);
                await fs.writeFile(filePath, buffer);
                
                const localUrl = `/uploads/${fileName}`;
                mediaUrl = localUrl;
                console.log('   ✅ Audio saved locally:', mediaUrl);
                console.log('   - Full path:', filePath);

                if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_CLOUD_NAME) {
                  try {
                    cloudinary.config({
                      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                      api_key: process.env.CLOUDINARY_API_KEY,
                      api_secret: process.env.CLOUDINARY_API_SECRET,
                    });
                    const dataUri = `data:${mediaType};base64,${buffer.toString('base64')}`;
                    const uploadRes = await cloudinary.uploader.upload(dataUri, {
                      folder: process.env.CLOUDINARY_FOLDER || 'whatsapp-automation',
                      public_id: path.parse(fileName).name,
                      resource_type: 'auto',
                    });
                    if (uploadRes?.secure_url) {
                      mediaUrl = uploadRes.secure_url;
                      console.log('   🔗 Uploaded audio to Cloudinary:', mediaUrl);
                    }
                  } catch (err) {
                    console.error('   ⚠️ Cloudinary upload failed for audio:', err);
                    mediaUrl = localUrl;
                  }
                }
              } catch (error: any) {
                console.error("   ❌ Error downloading audio:");
                console.error("   - Error type:", error?.constructor?.name);
                console.error("   - Error message:", error?.message);
                console.error("   - Full error:", error);
                mediaUrl = null;
              }
              
            } else if (message.message.documentMessage) {
              mediaType = message.message.documentMessage.mimetype || "application/octet-stream";
              console.log('📄 DOCUMENT MESSAGE DETECTED');
              console.log('   - MIME Type:', mediaType);
              console.log('   - File Name:', message.message.documentMessage.fileName || 'none');
              
              try {
                console.log('   - Starting download...');
                const stream = await downloadContentFromMessage(message.message.documentMessage, 'document');
                const chunks = [];
                
                for await (const chunk of stream) {
                  chunks.push(chunk);
                }
                
                const buffer = Buffer.concat(chunks);
                console.log('   - Download complete. Buffer size:', buffer.length, 'bytes');
                
                const fileName = message.message.documentMessage.fileName || `document_${Date.now()}`;
                
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
                await fs.ensureDir(uploadsDir);
                
                const filePath = path.join(uploadsDir, fileName);
                await fs.writeFile(filePath, buffer);
                
                const localUrl = `/uploads/${fileName}`;
                mediaUrl = localUrl;
                console.log('   ✅ Document saved locally:', mediaUrl);
                console.log('   - Full path:', filePath);

                if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_CLOUD_NAME) {
                  try {
                    cloudinary.config({
                      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                      api_key: process.env.CLOUDINARY_API_KEY,
                      api_secret: process.env.CLOUDINARY_API_SECRET,
                    });
                    const dataUri = `data:${mediaType};base64,${buffer.toString('base64')}`;
                    const uploadRes = await cloudinary.uploader.upload(dataUri, {
                      folder: process.env.CLOUDINARY_FOLDER || 'whatsapp-automation',
                      public_id: path.parse(fileName).name,
                      resource_type: 'auto',
                    });
                    if (uploadRes?.secure_url) {
                      mediaUrl = uploadRes.secure_url;
                      console.log('   🔗 Uploaded document to Cloudinary:', mediaUrl);
                    }
                  } catch (err) {
                    console.error('   ⚠️ Cloudinary upload failed for document:', err);
                    mediaUrl = localUrl;
                  }
                }
              } catch (error: any) {
                console.error("   ❌ Error downloading document:");
                console.error("   - Error type:", error?.constructor?.name);
                console.error("   - Error message:", error?.message);
                console.error("   - Full error:", error);
                mediaUrl = null;
              }
            }
            
            if (mediaUrl) {
              console.log('\n💾 READY TO SAVE TO DATABASE');
              console.log('   - Media Type:', mediaType);
              console.log('   - Media URL:', mediaUrl);
            } else if (mediaType) {
              console.log('\n⚠️ Media detected but download failed');
              console.log('   - Media Type:', mediaType);
            }

            // Get or create contact
            let contact = await db.query.contacts.findFirst({
              where: and(
                eq(contacts.userId, parseInt(userId)),
                eq(contacts.phoneNumber, senderNumber)
              ),
            });

            if (!contact) {
              const [newContact] = await db
                .insert(contacts)
                .values({
                  userId: parseInt(userId),
                  phoneNumber: senderNumber,
                  name: contactName,
                  lastMessageAt: new Date(),
                })
                .returning();
              contact = newContact;
            } else {
              // Update contact name if we got a better one and last message time
              await db
                .update(contacts)
                .set({
                  name:
                    contactName !== senderNumber ? contactName : contact.name,
                  lastMessageAt: new Date(),
                })
                .where(eq(contacts.id, contact.id));
            }

            // Save the message
            const messageData = {
              userId: parseInt(userId),
              contactId: contact.id,
              phoneNumber: senderNumber,
              message: messageText || (mediaType ? "Media message" : ""),
              mediaType,
              mediaUrl,
              isFromMe: false,
            };
            
            console.log('\n💾 SAVING MESSAGE TO DATABASE');
            console.log('   - User ID:', messageData.userId);
            console.log('   - Contact ID:', messageData.contactId);
            console.log('   - Phone:', messageData.phoneNumber);
            console.log('   - Message:', messageData.message);
            console.log('   - Media Type:', messageData.mediaType);
            console.log('   - Media URL:', messageData.mediaUrl);
            
            const [savedMessage] = await db.insert(chatMessages).values(messageData).returning();
            
            console.log('   ✅ Message saved with ID:', savedMessage.id);
            console.log("📨 Received message from:", senderNumber);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      }
    });

    sessions.set(userId, { sock, connected: false });
    return sessions.get(userId);
  } catch (error) {
    console.error("Error creating Baileys session:", error);
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
    console.log("✅ Using existing connected session for user:", userId);
    return existingSession;
  }

  // 2. If actively connecting/reconnecting, return the session (DON'T clear it!)
  if (reconnectingUsers.has(userId)) {
    console.log("⚠️ Connection attempt already in progress for user:", userId);
    return existingSession || null;
  }

  // 3. If session has socket but no user yet, it's still establishing connection
  if (existingSession?.sock && !existingSession?.sock?.user) {
    // Don't log on every status check - only when explicitly requested
    if (waitForQR) {
      console.log("⏳ Session connecting for user:", userId);
    }
    return existingSession; // Don't clear, let it finish connecting
  }

  // 4. If just checking status (waitForQR=false), return what exists even if partial
  if (!waitForQR) {
    return existingSession || null;
  }

  // 5. Only clear if session is truly dead AND we're about to create new one
  if (
    existingSession &&
    !existingSession?.sock &&
    !existingSession?.connected &&
    waitForQR
  ) {
    console.log("🧹 Clearing dead session for user:", userId);
    sessions.delete(userId);
    stopHeartbeat(userId);
  }

  // 6. Before creating new session, check if we have database backup
  if (!sessions.get(userId) && !reconnectingUsers.has(userId) && waitForQR) {
    // Check database first
    const dbState = await getSessionFromDatabase(userId);

    if (dbState) {
      // Session exists in database - restore and connect (NO QR needed)
      console.log("💾 Found session in database, restoring and connecting...");
      await createBaileysSession(userId);

      // Wait for connection to establish (not QR, but actual connection)
      console.log("⏳ Waiting for WhatsApp connection...");
      const restoredSession = await new Promise<any>((resolve) => {
        let attempts = 0;
        const checkConnection = setInterval(() => {
          const session = sessions.get(userId);
          attempts++;

          // Success: Connected
          if (session?.connected && session?.sock?.user) {
            clearInterval(checkConnection);
            console.log("✅ Session restored and connected successfully");
            resolve(session);
          }

          // QR generated means restoration failed
          if (session?.qr) {
            clearInterval(checkConnection);
            console.log(
              "⚠️ QR generated during restoration - credentials were invalid"
            );
            resolve(session);
          }

          // Failure: Session deleted (Status 401/440 logout detected)
          if (!session && attempts > 2) {
            clearInterval(checkConnection);
            console.log("❌ Session was deleted - invalid credentials");
            resolve(null);
          }

          // Timeout after 8 seconds (reduced from 15)
          if (attempts >= 16) {
            // 16 * 500ms = 8 seconds
            clearInterval(checkConnection);
            console.log(
              "⏱️ Restoration timeout - assuming credentials invalid"
            );
            resolve(session);
          }
        }, 500);
      });

      // Check if restoration failed (session deleted, QR generated, or timeout)
      const currentSession = sessions.get(userId);
      const restorationFailed =
        !restoredSession ||
        !currentSession ||
        currentSession?.qr ||
        (!currentSession?.connected && !currentSession?.connecting);

      if (restorationFailed) {
        console.log(
          "❌ Session restoration failed (invalid credentials). Generating fresh QR code..."
        );

        // Clear database backup since it's invalid (run synchronously to prevent retry)
        try {
          await db
            .update(users)
            .set({
              whatsappSession: null,
            })
            .where(eq(users.id, parseInt(userId)));
          console.log("🗑️ Cleared invalid database backup for user:", userId);
        } catch (error) {
          console.error("Failed to clear database backup:", error);
        }

        // If QR was already generated during restoration attempt, we're done
        if (currentSession?.qr) {
          console.log("✅ QR already available from failed restoration");
          return currentSession;
        }

        // Otherwise, create fresh session for QR generation
        await createBaileysSession(userId);

        // Wait for QR code
        await new Promise((resolve, reject) => {
          qrResolvers.set(userId, resolve);
          setTimeout(() => {
            if (qrResolvers.has(userId)) {
              qrResolvers.delete(userId);
              reject(new Error("QR code generation timeout"));
            }
          }, 30000);
        }).catch((err) => {
          console.error("QR generation timeout:", err);
        });
      }
    } else {
      // No database backup - create fresh session and wait for QR
      console.log(
        "🆕 Creating new session (no backup found), will generate QR code..."
      );
      await createBaileysSession(userId);

      // Wait for QR code to be generated (up to 30 seconds)
      if (!sessions.get(userId)?.qr && !sessions.get(userId)?.connected) {
        console.log("⏳ Waiting for QR code generation...");
        await new Promise((resolve, reject) => {
          qrResolvers.set(userId, resolve);

          // Timeout after 30 seconds
          setTimeout(() => {
            if (qrResolvers.has(userId)) {
              qrResolvers.delete(userId);
              reject(new Error("QR code generation timeout"));
            }
          }, 30000);
        }).catch((err) => {
          console.error("QR generation timeout:", err);
        });
      }
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
      console.error("Logout error:", error);
    }
    sessions.delete(userId);
    // Clear message store for this user
    const keysToDelete = Array.from(messageStore.keys()).filter((key) =>
      key.startsWith(`${userId}_`)
    );
    keysToDelete.forEach((key) => messageStore.delete(key));
    reconnectingUsers.delete(userId);
    qrResolvers.delete(userId);

    // Stop heartbeat
    stopHeartbeat(userId);

    // Clear session files
    const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
    await fs
      .remove(sessionDir)
      .catch((err) =>
        console.error("Failed to remove session directory:", err)
      );
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
  const keysToDelete = Array.from(messageStore.keys()).filter((key) =>
    key.startsWith(`${userId}_`)
  );
  keysToDelete.forEach((key) => messageStore.delete(key));

  console.log(`✅ Session cleared for user ${userId}`);
}

export function getStoredMessages(userId: string, phoneNumber: string) {
  const userKey = `${userId}_${phoneNumber}`;
  return messageStore.get(userKey) || [];
}
