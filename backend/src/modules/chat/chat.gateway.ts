import { Server, Socket } from "socket.io";
import { incUserSocket, decUserSocket, getOnlineUsers } from "../../shared/presence";
import { MessageModel } from "../messages/message.model";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    console.log(`🟢 Socket connected: ${socket.id} user=${userId ?? "-"}`);

    socket.join("global");

    // Historial de chat
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

    // Presence: conexión
    (async () => {
      if (!userId) return;
      try {
        await incUserSocket(userId);
        io.emit("user:online", { userId }); // incremental
        const all = await getOnlineUsers();
        io.emit("presence:update", { onlineUsers: all }); // snapshot
      } catch (e) {
        console.error("❌ presence inc error", e);
      }
    })();

    // Chat
    socket.on("chat:message", async (payload: { text: string }) => {
      try {
        const doc = await new MessageModel({
          userId: userId ?? "anonymous",
          content: payload.text,
          room: "global",
        }).save();

        io.to("global").emit("chat:message", {
          user: userId ?? "anonymous",
          text: payload.text,
          at: doc.createdAt?.getTime?.() ?? Date.now(),
        });
      } catch (e) {
        console.error("❌ Error guardando mensaje:", e);
      }
    });

    // Presence: desconexión
    socket.on("disconnect", async () => {
      console.log(`🔴 Socket disconnected: ${socket.id} user=${userId ?? "-"}`);
      if (!userId) return;
      try {
        const becameOffline = await decUserSocket(userId);
        if (becameOffline) io.emit("user:offline", { userId }); // incremental
        const all = await getOnlineUsers();
        io.emit("presence:update", { onlineUsers: all }); // snapshot
      } catch (e) {
        console.error("❌ presence dec error", e);
      }
    });
  });
}
