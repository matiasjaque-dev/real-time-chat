import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const JWT_SECRET = process.env.JWT_SECRET ?? "super-secret-key";

export function setupSocket(httpServer: ReturnType<typeof createServer>) {
  const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000" },
  });

  // Adapter Redis (pub/sub entre instancias)
  const pubClient = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("✅ Socket.io Redis adapter conectado");
  }).catch((e) => console.error("❌ Redis adapter error:", e));

  // Auth JWT en handshake (no reemplaza Redis)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication error"));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  return io;
}
