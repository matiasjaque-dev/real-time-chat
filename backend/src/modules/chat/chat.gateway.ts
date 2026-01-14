import { Server, Socket } from "socket.io";
import { MessageModel } from "../messages/message.model";

export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    console.log(`🟢 Socket connected: ${socket.id} user=${userId ?? "-"}`);

    socket.join("global");

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
  });
}
