import { Server } from "socket.io";
import { Server as HttpServer } from "http";

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  return io;
}
