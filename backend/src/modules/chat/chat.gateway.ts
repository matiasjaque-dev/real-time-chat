import { Server, Socket } from "socket.io";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    socket.on("ping", () => {
      console.log(`📨 Ping from ${socket.id}`);
      socket.emit("pong");
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
}
