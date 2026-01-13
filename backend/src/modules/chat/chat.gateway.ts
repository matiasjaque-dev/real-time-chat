import { Server, Socket } from "socket.io";
import { MessageModel } from "../messages/message.model";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // Únete a la sala global
    socket.join("global");

    // Enviar historial al conectarse
    (async () => {
      try {
        const messages = await MessageModel.find({ room: "global" })
          .sort({ createdAt: 1 })
          .limit(50)
          .lean();
        socket.emit("chat_history", messages); // o "chat:history" si prefieres
      } catch (e) {
        console.error("❌ Error enviando historial:", e);
      }
    })();

    socket.on("ping", () => {
      console.log(`📨 Ping from ${socket.id}`);
      socket.emit("pong");
    });

    // Guardar y difundir mensajes
    socket.on(
      "chat:message",
      async (payload: { user: string; text: string }) => {
        try {
          const doc = await new MessageModel({
            userId: payload.user,
            content: payload.text,
            room: "global",
          }).save();

          io.to("global").emit("chat:message", {
            user: payload.user,
            text: payload.text,
            at: doc.createdAt?.getTime?.() ?? Date.now(),
          });
        } catch (e) {
          console.error("❌ Error guardando mensaje:", e);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
}
