import { Server, Socket } from "socket.io";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    socket.on("ping", () => {
      console.log(`📨 Ping from ${socket.id}`);
      socket.emit("pong");
    });

    // Nuevo: evento de mensaje
    socket.on("chat:message", (payload: { user: string; text: string }) => {
      console.log(`💬 [${payload.user}] ${payload.text} @ ${socket.id}`);
      // Difunde a todos (en todas las instancias gracias al adapter)
      io.emit("chat:message", {
        user: payload.user,
        text: payload.text,
        at: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
}
