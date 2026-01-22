import { Server, Socket } from "socket.io";
import { MessageModel } from "../messages/message.model";
import { incUserSocket, decUserSocket, getOnlineUsers } from "../../shared/presence";
import { checkRateLimit } from "../../shared/rate-limit";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    console.log(`🟢 Socket connected: ${socket.id} user=${userId ?? "-"}`);

    socket.join("global");

    // Enviar historial al conectar
    (async () => {
      try {
        const messages = await MessageModel.find({ room: "global" })
          .sort({ createdAt: 1 })
          .limit(50)
          .lean();
        socket.emit("chat_history", messages);
      } catch (e) {
        console.error("❌ Error enviando historial:", e);
      }
    })();

    // Presence: marcar online
    (async () => {
      if (!userId) return;
      try {
        await incUserSocket(userId);
        io.emit("user:online", { userId });
        const all = await getOnlineUsers();
        io.emit("presence:update", { onlineUsers: all });
      } catch (e) {
        console.error("❌ presence inc error:", e);
      }
    })();

    // Handler de mensajes con rate limit
    socket.on("chat:message", async (payload: { text: string }) => {
      try {
        if (!userId) {
          socket.emit("chat:error", { message: "Unauthorized" });
          return;
        }
        const text = payload?.text?.trim();
        if (!text) return;

        // Rate limit
        const allowed = await checkRateLimit(userId);
        if (!allowed) {
          socket.emit("chat:error", { message: "Rate limit exceeded. Slow down." });
          return;
        }

        // Guardar en Mongo
        const doc = await new MessageModel({
          userId,
          content: text,
          room: "global",
        }).save();

        // Emitir a todos (se sincroniza entre instancias via Redis adapter)
        io.to("global").emit("chat:message", {
          user: userId,
          text,
          at: doc.createdAt?.getTime?.() ?? Date.now(),
        });
      } catch (e) {
        console.error("❌ Error en chat:message:", e);
        socket.emit("chat:error", { message: "Internal error" });
      }
    });

    // Presence: desconexión correcta
    socket.on("disconnect", async () => {
      console.log(`🔴 Socket disconnected: ${socket.id} user=${userId ?? "-"}`);
      if (!userId) return;
      try {
        const becameOffline = await decUserSocket(userId);
        if (becameOffline) io.emit("user:offline", { userId });
        const all = await getOnlineUsers();
        io.emit("presence:update", { onlineUsers: all });
      } catch (e) {
        console.error("❌ presence dec error:", e);
      }
    });
  });
}
