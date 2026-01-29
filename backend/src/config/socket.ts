import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const JWT_SECRET = process.env.JWT_SECRET ?? "super-secret-key";
if (JWT_SECRET === "super-secret-key") {
  console.warn(
    "⚠️ Using default JWT_SECRET. Change this in production for security.",
  );
}

const REDIS_URL = process.env.REDIS_URL; // Optional: when absent, app runs in single-instance mode
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
if (!process.env.FRONTEND_ORIGIN) {
  console.warn(
    "⚠️ FRONTEND_ORIGIN not set. Defaulting to http://localhost:3000",
  );
}

/**
 * Initialize Socket.io server with Redis adapter and JWT authentication
 * @param httpServer - HTTP server instance to attach Socket.io to
 * @returns Configured Socket.io server instance
 */
export function setupSocket(httpServer: ReturnType<typeof createServer>) {
  // Create Socket.io server with CORS configuration
  const io = new Server(httpServer, {
    cors: { origin: FRONTEND_ORIGIN },
  });

  // ===== Redis Adapter Setup =====
  // Configure Redis pub/sub for multi-instance horizontal scaling if REDIS_URL is provided
  if (REDIS_URL) {
    try {
      const pubClient = createClient({ url: REDIS_URL });
      const subClient = pubClient.duplicate();

      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          console.log("✅ Socket.io Redis adapter connected");
        })
        .catch((error) => {
          console.error("❌ Redis adapter error:", error);
          console.warn(
            "⚠️ Continuing without Redis adapter; running in single-instance mode.",
          );
        });
    } catch (error) {
      console.error("❌ Failed to initialize Redis adapter:", error);
      console.warn(
        "⚠️ Continuing without Redis adapter; running in single-instance mode.",
      );
    }
  } else {
    console.warn(
      "⚠️ REDIS_URL not set. Socket.io will run without Redis adapter (single-instance mode).",
    );
  }

  // ===== JWT Authentication Middleware =====
  // Validate JWT token on socket handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Missing authentication token"));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  return io;
}
