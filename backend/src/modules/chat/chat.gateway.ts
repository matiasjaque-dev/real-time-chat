import { Server, Socket } from "socket.io";
import { MessageModel } from "../messages/message.model";
import { incUserSocket, decUserSocket, getOnlineUsers } from "../../shared/presence";
import { checkRateLimit } from "../../shared/rate-limit";

const CHAT_ROOM = "global";
const MESSAGE_HISTORY_LIMIT = 50;

/**
 * Register Socket.io event handlers for real-time chat functionality
 * Handles: message broadcasts, user presence tracking, rate limiting
 * @param io - Socket.io server instance
 */
export function registerChatGateway(io: Server) {
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    console.log(`🟢 Socket connected: ${socket.id} user=${userId ?? "anonymous"}`);

    // Join global chat room
    socket.join(CHAT_ROOM);

    // ===== Send Message History =====
    handleChatHistory(socket);

    // ===== User Presence =====
    // Mark user as online and broadcast to all clients
    handleUserJoin(userId, socket, io);

    // ===== Message Handler =====
    // Receive messages with rate limiting and persistence
    socket.on("chat:message", (payload) =>
      handleChatMessage(payload, userId, socket, io)
    );

    // ===== Disconnection Handler =====
    // Mark user as offline and broadcast to all clients
    socket.on("disconnect", () => handleUserDisconnect(userId, socket, io));
  });
}

/**
 * Retrieve and send chat message history to newly connected socket
 */
async function handleChatHistory(socket: Socket) {
  try {
    const messages = await MessageModel.find({ room: CHAT_ROOM })
      .sort({ createdAt: 1 })
      .limit(MESSAGE_HISTORY_LIMIT)
      .lean();
    socket.emit("chat_history", messages);
  } catch (error) {
    console.error("❌ Failed to load chat history:", error);
  }
}

/**
 * Handle user join: mark user online and update presence for all clients
 */
async function handleUserJoin(userId: string | undefined, socket: Socket, io: Server) {
  if (!userId) return;
  try {
    await incUserSocket(userId);
    io.emit("user:online", { userId });
    const onlineUsers = await getOnlineUsers();
    io.emit("presence:update", { onlineUsers });
  } catch (error) {
    console.error("❌ Failed to mark user online:", error);
  }
}

/**
 * Handle incoming chat message: validate, rate limit, persist, and broadcast
 */
async function handleChatMessage(
  payload: { text?: string },
  userId: string | undefined,
  socket: Socket,
  io: Server
) {
  try {
    // Verify user is authenticated
    if (!userId) {
      socket.emit("chat:error", { message: "Unauthorized: Please login first" });
      return;
    }

    // Validate message content
    const messageText = payload?.text?.trim();
    if (!messageText) return;

    // Check rate limit
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      socket.emit("chat:error", {
        message: "Rate limit exceeded. Please slow down.",
      });
      return;
    }

    // Save message to database
    const savedMessage = await new MessageModel({
      userId,
      content: messageText,
      room: CHAT_ROOM,
    }).save();

    // Broadcast message to all clients in the chat room
    io.to(CHAT_ROOM).emit("chat:message", {
      user: userId,
      text: messageText,
      at: savedMessage.createdAt?.getTime?.() ?? Date.now(),
    });
  } catch (error) {
    console.error("❌ Failed to process chat message:", error);
    socket.emit("chat:error", { message: "Failed to send message" });
  }
}

/**
 * Handle user disconnect: mark user offline and update presence for all clients
 */
async function handleUserDisconnect(userId: string | undefined, socket: Socket, io: Server) {
  console.log(`🔴 Socket disconnected: ${socket.id} user=${userId ?? "anonymous"}`);

  if (!userId) return;
  try {
    const becameOffline = await decUserSocket(userId);
    if (becameOffline) {
      io.emit("user:offline", { userId });
    }
    const onlineUsers = await getOnlineUsers();
    io.emit("presence:update", { onlineUsers });
  } catch (error) {
    console.error("❌ Failed to mark user offline:", error);
  }
}
