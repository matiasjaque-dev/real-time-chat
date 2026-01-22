import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const JWT_SECRET = process.env.JWT_SECRET ?? "super-secret-key";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const FRONTEND_ORIGIN = "http://localhost:3000";

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
  // Configure Redis pub/sub for multi-instance horizontal scaling
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.io Redis adapter connected");
    })
    .catch((error) => console.error("❌ Redis adapter error:", error));

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
