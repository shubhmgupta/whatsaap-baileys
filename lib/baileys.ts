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
import { eq, and, lt, or, sql } from "drizzle-orm";
import pino from "pino";
import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load .env early so Cloudinary config can read variables when this module loads
dotenv.config();

// Configure Cloudinary once at module initialization if env vars are present
if (
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("✅ Cloudinary configured (module init)");
} else {
  console.warn("⚠️ Cloudinary not fully configured (missing env vars). Uploads will fail.");
}

const execAsync = promisify(exec);

// Helper: upload a Buffer to Cloudinary and return the secure_url (or null)
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mediaType: string,
  fileName: string
): Promise<string | null> {
  // Ensure cloudinary was configured at module init
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary not configured");
  }

  const dataUri = `data:${mediaType};base64,${buffer.toString("base64")}`;

  try {
    const rawName = path.parse(fileName || 'file').name;
    const safePublicId = `${Date.now()}_${rawName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60)}`;

    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: process.env.CLOUDINARY_FOLDER || "whatsapp-automation",
      public_id: safePublicId,
      resource_type: "auto",
    });

    // Log full response for debugging (secure_url typically present)
    console.log("   🔁 Cloudinary upload response:", uploadRes?.secure_url);

    return uploadRes?.secure_url ?? null;
  } catch (err) {
    console.error("   ❌ Cloudinary uploader threw an error:", err);
    throw err;
  }
}

// Helper: recursively unwrap ephemeral, viewOnce, and document-wrapped messages
export function extractActualMessage(msg: any): any {
  if (!msg) return null;
  if (msg.ephemeralMessage?.message) return extractActualMessage(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage?.message) return extractActualMessage(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2?.message) return extractActualMessage(msg.viewOnceMessageV2.message);
  if (msg.documentWithCaptionMessage?.message) return extractActualMessage(msg.documentWithCaptionMessage.message);
  return msg;
}

// In-memory cache for WhatsApp LID -> Phone Number mappings
const lidToPhoneCache = new Map<string, string>();

// Resolve WhatsApp JID (phone number or LID) to clean international phone digits
export async function resolvePhoneNumber(
  userId: string,
  jid: string,
  participantPn?: string,
  participant?: string
): Promise<string> {
  // 1. If explicit phone number is provided in participantPn (common in Baileys multi-device)
  if (participantPn) {
    const clean = participantPn.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (clean && clean.length >= 7) return clean;
  }

  // 2. If participant is a direct phone number
  if (participant && (participant.endsWith("@s.whatsapp.net") || participant.endsWith("@c.us"))) {
    const clean = participant.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (clean && clean.length >= 7) return clean;
  }

  // 3. If remoteJid itself is a direct phone number
  if (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@c.us")) {
    const clean = jid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (clean && clean.length >= 7) return clean;
  }

  // 4. If remoteJid is @lid, resolve via cache or matching device registrationId in session files
  const rawLid = jid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  if (lidToPhoneCache.has(rawLid)) {
    return lidToPhoneCache.get(rawLid)!;
  }

  try {
    const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
    const lidFile = path.join(sessionDir, `session-${rawLid}.0.json`);
    if (await fs.pathExists(lidFile)) {
      const lidData = await fs.readJson(lidFile);
      const regId = (Object.values(lidData._sessions || {})[0] as any)?.registrationId;
      if (regId) {
        const files = await fs.readdir(sessionDir);
        for (const file of files) {
          if (!file.startsWith("session-") || file.includes(rawLid) || !file.endsWith(".0.json")) continue;
          const num = file.replace("session-", "").replace(".0.json", "");
          if (num.length > 13) continue; // Phone numbers are <= 13 digits, LIDs are 14+ digits
          const d = await fs.readJson(path.join(sessionDir, file));
          const r = (Object.values(d._sessions || {})[0] as any)?.registrationId;
          if (r === regId) {
            console.log(`🔗 Resolved WhatsApp LID ${rawLid} -> phone number ${num} via registrationId ${regId}`);
            lidToPhoneCache.set(rawLid, num);
            return num;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error resolving WhatsApp LID to phone number:", err);
  }

  return rawLid;
}

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

  // Send gentle presence update every 3 minutes (180s) to keep presence fresh without spamming
  const interval = setInterval(async () => {
    try {
      if (sock?.user) {
        await sock.sendPresenceUpdate("available");
      }
    } catch (error) {
      // Ignore errors, connection will auto-reconnect if needed
    }
  }, 180000);

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
    if (existing?.connected && existing?.sock?.user) {
      console.log(`✅ Session already connected in-memory for user ${userId}`);
      return existing;
    }

    // If not already connecting, create socket and attempt connection
    if (!reconnectingUsers.has(userId)) {
      await createBaileysSession(userId);
    }

    // Wait up to 15 seconds for connection
    const session = await new Promise<any>((resolve) => {
      let attempts = 0;
      const iv = setInterval(() => {
        const s = sessions.get(userId);
        attempts++;
        if (s?.connected && s?.sock?.user) {
          clearInterval(iv);
          resolve(s);
        } else if (attempts >= 30) {
          // 30 * 500ms = 15s
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
  if (existingSession?.sock?.user && existingSession?.connected) {
    console.log("✅ Using existing active session for user:", userId);
    return existingSession;
  }

  // If a previous socket exists for this user, detach and end it cleanly
  if (existingSession?.sock) {
    try {
      console.log(`🧹 Detaching old socket for user ${userId} before creating new one...`);
      existingSession.sock.ev.removeAllListeners("connection.update");
      existingSession.sock.ev.removeAllListeners("creds.update");
      existingSession.sock.ev.removeAllListeners("messages.upsert");
      existingSession.sock.end(new Error("Superseded by new session"));
    } catch (e) {
      // Ignore
    }
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
          // Handle connection replaced / conflict (Status 440 / connectionReplaced)
          if (
            statusCode === DisconnectReason.connectionReplaced ||
            statusCode === 440
          ) {
            console.log(
              `⚠️ Connection replaced / conflict (Status 440) for user ${userId}. Preserving session files and reconnecting...`
            );

            // Do NOT delete session files or DB backup! Mark disconnected and re-establish.
            const current = sessions.get(userId);
            if (current?.sock === sock) {
              sessions.set(userId, { ...current, connected: false });
            }
            reconnectingUsers.delete(userId);

            // Re-establish connection after brief pause if not already reconnected
            setTimeout(() => {
              const latest = sessions.get(userId);
              if (!latest?.connected && !reconnectingUsers.has(userId)) {
                console.log(`🔄 Re-establishing WhatsApp socket for user ${userId} after 440...`);
                createBaileysSession(userId).catch((err) => {
                  console.error("Error reconnecting session after 440:", err);
                  reconnectingUsers.delete(userId);
                });
              }
            }, 3000);
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
          const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
          const credsPath = path.join(sessionDir, "creds.json");
          let sessionData = "";
          if (await fs.pathExists(credsPath)) {
            const creds = await fs.readJson(credsPath);
            sessionData = JSON.stringify({ creds });
          } else {
            sessionData = JSON.stringify({ creds: state.creds });
          }

          await db
            .update(users)
            .set({
              whatsappSession: sessionData,
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

    let credsBackupTimeout: NodeJS.Timeout | null = null;
    sock.ev.on("creds.update", async () => {
      try {
        // Check if session directory still exists before saving
        const sessionDir = path.join(process.cwd(), `sessions/user_${userId}`);
        const exists = await fs.pathExists(sessionDir);
        if (exists) {
          await saveCreds();

          // Debounce database sync so rotated tokens are permanently updated in DB
          if (credsBackupTimeout) clearTimeout(credsBackupTimeout);
          credsBackupTimeout = setTimeout(async () => {
            try {
              const credsPath = path.join(sessionDir, "creds.json");
              if (await fs.pathExists(credsPath)) {
                const creds = await fs.readJson(credsPath);
                await db
                  .update(users)
                  .set({ whatsappSession: JSON.stringify({ creds }) })
                  .where(eq(users.id, parseInt(userId)));
                console.log(`💾 Synced rotated credentials to DB for user ${userId}`);
              }
            } catch (err) {
              console.error("Failed to sync rotated credentials to DB:", err);
            }
          }, 3000);
        }
      } catch (error) {
        // Ignore ENOENT errors (file doesn't exist) as session may have been cleared
        if ((error as any).code !== "ENOENT") {
          console.error("Error saving credentials:", error);
        }
      }
    });

    // Cache any LID-to-Phone-Number mappings sent by WhatsApp
    (sock.ev as any).on("lid-mapping.update", (update: any) => {
      if (update?.mapping) {
        for (const [lid, pn] of Object.entries(update.mapping)) {
          const cleanLid = (lid as string).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
          const cleanPn = (pn as string).split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
          if (cleanLid && cleanPn) {
            lidToPhoneCache.set(cleanLid, cleanPn);
            console.log(`🔗 Cached WhatsApp LID mapping: ${cleanLid} -> ${cleanPn}`);
          }
        }
      }
    });

    // Helper to process a single message (ONLY for saved contacts in database)
    const processMessageForSavedContact = async (message: any) => {
      try {
        const jid = message?.key?.remoteJid || "";

        // STRICT FILTER: Skip status broadcasts, groups, broadcast lists, and newsletters
        if (
          !jid ||
          jid === "status@broadcast" ||
          jid.endsWith("@g.us") ||
          jid.endsWith("@broadcast") ||
          jid.endsWith("@newsletter")
        ) {
          return;
        }

        // Must be an individual chat (@s.whatsapp.net, @c.us, or @lid)
        if (!jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@c.us") && !jid.endsWith("@lid")) {
          return;
        }

        // Resolve phone number from direct JID, participantPn, or LID device registration mapping
        const partnerNumber = await resolvePhoneNumber(
          userId,
          jid,
          (message.key as any)?.participantPn,
          message.key.participant || undefined
        );

        if (!partnerNumber || partnerNumber.length < 5) {
          return;
        }

        const last10 = partnerNumber.length >= 10 ? partnerNumber.slice(-10) : partnerNumber;
        const cleanPartner = partnerNumber.replace(/[^0-9]/g, '');

        // STRICT CHECK: ONLY proceed if this number is an ALREADY SAVED contact in the database for this user
        const contact = await db.query.contacts.findFirst({
          where: and(
            eq(contacts.userId, parseInt(userId)),
            or(
              eq(contacts.phoneNumber, partnerNumber),
              eq(contacts.phoneNumber, cleanPartner),
              sql`${contacts.phoneNumber} LIKE ${'%' + last10}`
            )
          ),
        });

        if (!contact) {
          // Unsaved number: DO NOT auto-create contact, DO NOT fetch or save messages
          return;
        }

        const rawMsg = extractActualMessage(message.message);
        if (!rawMsg) return;

        // Skip protocol/reaction messages (e.g. reactions, deletes, ephemeral settings)
        if (rawMsg.protocolMessage || rawMsg.reactionMessage) {
          return;
        }

        // Parse message timestamp accurately from WhatsApp epoch
        const msgTime = message.messageTimestamp
          ? new Date(
              (typeof message.messageTimestamp === "string"
                ? parseInt(message.messageTimestamp)
                : Number(message.messageTimestamp)) * 1000
            )
          : new Date();

        const isFromMe = Boolean(message.key.fromMe);

        // Deduplication check: do not insert duplicate message for the same contact & timestamp
        const existingMsg = await db.query.chatMessages.findFirst({
          where: and(
            eq(chatMessages.userId, parseInt(userId)),
            eq(chatMessages.contactId, contact.id),
            eq(chatMessages.timestamp, msgTime),
            eq(chatMessages.isFromMe, isFromMe)
          ),
        });

        if (existingMsg) {
          return;
        }

        const messageText =
          rawMsg.conversation ||
          rawMsg.extendedTextMessage?.text ||
          rawMsg.imageMessage?.caption ||
          rawMsg.videoMessage?.caption ||
          rawMsg.documentMessage?.caption ||
          "";

        // Determine media type and upload to Cloudinary if media exists
        let mediaType: string | null = null;
        let mediaUrl: string | null = null;

        if (rawMsg.imageMessage) {
          const mime = rawMsg.imageMessage.mimetype || "image/jpeg";
          mediaType = mime;
          try {
            const stream = await downloadContentFromMessage(rawMsg.imageMessage, "image");
            const chunks: Buffer[] = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0 && process.env.CLOUDINARY_API_KEY) {
              const ext = mime.split("/")[1] || "jpg";
              const fileName = `img_${Date.now()}.${ext}`;
              mediaUrl = await uploadBufferToCloudinary(buffer, mime, fileName);
            }
          } catch (err) {
            console.error("Error downloading/uploading image:", err);
          }
        } else if (rawMsg.videoMessage) {
          const mime = rawMsg.videoMessage.mimetype || "video/mp4";
          mediaType = mime;
          try {
            const stream = await downloadContentFromMessage(rawMsg.videoMessage, "video");
            const chunks: Buffer[] = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0 && process.env.CLOUDINARY_API_KEY) {
              const ext = mime.split("/")[1] || "mp4";
              const fileName = `vid_${Date.now()}.${ext}`;
              mediaUrl = await uploadBufferToCloudinary(buffer, mime, fileName);
            }
          } catch (err) {
            console.error("Error downloading/uploading video:", err);
          }
        } else if (rawMsg.audioMessage) {
          const mime = rawMsg.audioMessage.mimetype || "audio/ogg";
          mediaType = mime;
          try {
            const stream = await downloadContentFromMessage(rawMsg.audioMessage, "audio");
            const chunks: Buffer[] = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0 && process.env.CLOUDINARY_API_KEY) {
              const ext = mime.split("/")[1] || "ogg";
              const fileName = `aud_${Date.now()}.${ext}`;
              mediaUrl = await uploadBufferToCloudinary(buffer, mime, fileName);
            }
          } catch (err) {
            console.error("Error downloading/uploading audio:", err);
          }
        } else if (rawMsg.documentMessage) {
          const mime = rawMsg.documentMessage.mimetype || "application/octet-stream";
          mediaType = mime;
          try {
            const stream = await downloadContentFromMessage(rawMsg.documentMessage, "document");
            const chunks: Buffer[] = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0 && process.env.CLOUDINARY_API_KEY) {
              const fileName = rawMsg.documentMessage.fileName || `doc_${Date.now()}`;
              mediaUrl = await uploadBufferToCloudinary(buffer, mime, fileName);
            }
          } catch (err) {
            console.error("Error downloading/uploading document:", err);
          }
        }

        const finalMessage =
          messageText ||
          rawMsg.imageMessage?.caption ||
          rawMsg.videoMessage?.caption ||
          rawMsg.documentMessage?.caption ||
          null;

        // Save message for the saved contact
        const messageData = {
          userId: parseInt(userId),
          contactId: contact.id,
          phoneNumber: contact.phoneNumber || partnerNumber,
          message: finalMessage,
          mediaType,
          mediaUrl,
          isFromMe,
          timestamp: msgTime,
        };

        const [savedResult] = await db
          .insert(chatMessages)
          .values(messageData)
          .$returningId();

        // Update lastMessageAt on the saved contact
        await db
          .update(contacts)
          .set({ lastMessageAt: msgTime })
          .where(eq(contacts.id, contact.id));

        console.log(`✅ Saved ${isFromMe ? 'outgoing' : 'incoming'} message (ID: ${savedResult.id}) for SAVED contact: ${contact.name || contact.phoneNumber}`);
      } catch (err) {
        console.error("Error processing message for saved contact:", err);
      }
    };

    // Listen for incoming and outgoing real-time messages
    sock.ev.on("messages.upsert", async (m) => {
      for (const message of m.messages) {
        await processMessageForSavedContact(message);
      }
    });

    // Listen for history sync messages (only saves messages for saved contacts)
    sock.ev.on("messaging-history.set", async (history: any) => {
      try {
        if (history?.messages && Array.isArray(history.messages)) {
          console.log(`📜 Processing ${history.messages.length} historical messages (SAVED CONTACTS ONLY)...`);
          for (const message of history.messages) {
            await processMessageForSavedContact(message);
          }
        }
      } catch (err) {
        console.error("Error processing history sync:", err);
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

          // Timeout after 20 seconds
          if (attempts >= 40) {
            // 40 * 500ms = 20 seconds
            clearInterval(checkConnection);
            console.log(
              "⏱️ Restoration check completed"
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

export async function reconnectSession(userId: string) {
  const existing = sessions.get(userId);
  if (existing?.sock) {
    try {
      console.log(`🔄 Force reconnecting WhatsApp socket for user ${userId} to apply updated handlers...`);
      existing.sock.ev.removeAllListeners("connection.update");
      existing.sock.ev.removeAllListeners("creds.update");
      existing.sock.ev.removeAllListeners("messages.upsert");
      existing.sock.ev.removeAllListeners("messaging-history.set");
      existing.sock.end(new Error("Socket reload requested"));
    } catch (e) {
      // Ignore
    }
  }
  sessions.delete(userId);
  stopHeartbeat(userId);
  reconnectingUsers.delete(userId);
  return await createBaileysSession(userId);
}

export function getStoredMessages(userId: string, phoneNumber: string) {
  const userKey = `${userId}_${phoneNumber}`;
  return messageStore.get(userKey) || [];
}
