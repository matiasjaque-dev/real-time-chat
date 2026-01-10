import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

export function setupSocket(httpServer: ReturnType<typeof createServer>) {
  const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000" },
  });

  // Redis adapter (pub/sub)
  const pubClient = createClient({ url: "redis://localhost:6379" });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (e) => console.error("Redis pub error:", e));
  subClient.on("error", (e) => console.error("Redis sub error:", e));

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("✅ Socket.io Redis adapter conectado");
  });

  return io;
}
