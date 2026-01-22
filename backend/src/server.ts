import { createServer } from "http";
import { app } from "./app";
import { setupSocket } from "./config/socket";
import { registerChatGateway } from "./modules/chat/chat.gateway";
import { redisClient } from "./config/redis";
import { connectMongo } from "./config/mongo";

const PORT = process.env.PORT || 4000;

/**
 * Initialize and start the backend server
 * Bootstraps: HTTP server, Socket.io, Redis adapter, MongoDB connection
 */
async function bootstrap() {
  try {
    // Create HTTP server from Express app
    const httpServer = createServer(app);

    // Initialize Socket.io with authentication middleware and Redis adapter
    const io = setupSocket(httpServer);
    registerChatGateway(io);

    // ===== Redis Connection =====
    // Connect Redis client for caching, sessions, and pub/sub
    try {
      if (!(redisClient as any).isOpen) {
        await redisClient.connect();
      }
      // Verify connection with test operation
      await redisClient.set("test", "hello redis");
      const testValue = await redisClient.get("test");
      console.log(`✅ Redis connected: ${testValue}`);
    } catch (redisError) {
      console.error("❌ Redis connection failed:", redisError);
      throw redisError;
    }

    // ===== MongoDB Connection =====
    // Connect to MongoDB for message persistence
    try {
      await connectMongo();
    } catch (mongoError) {
      console.error("❌ MongoDB connection failed:", mongoError);
      process.exit(1);
    }

    // Start HTTP server and listen for connections
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (bootstrapError) {
    console.error("❌ Bootstrap failed:", bootstrapError);
    process.exit(1);
  }
}

bootstrap();
