import { createServer } from "http";
import { app } from "./app";
import { setupSocket } from "./config/socket";
import { registerChatGateway } from "./modules/chat/chat.gateway";
import { redisClient } from "./config/redis";

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  const httpServer = createServer(app);

  const io = setupSocket(httpServer);
  registerChatGateway(io);

  // Conectar Redis (node-redis v4 requiere connect())
  try {
    if (!(redisClient as any).isOpen) {
      await redisClient.connect();
    }
    await redisClient.set("test", "hello redis");
    const value = await redisClient.get("test");
    console.log(`✅ Redis OK: ${value}`);
  } catch (err) {
    console.error("❌ Redis error:", err);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap error:", err);
  process.exit(1);
});
