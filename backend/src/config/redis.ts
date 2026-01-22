import { createClient } from "redis";

const REDIS_URL = "redis://localhost:6379";

/**
 * Redis client singleton for:
 * - Message rate limiting
 * - User presence tracking
 * - Socket.io pub/sub adapter
 */
export const redisClient = createClient({
  url: REDIS_URL,
});

// Log successful connection
redisClient.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

// Log connection errors
redisClient.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
});
