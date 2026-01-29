import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

/**
 * Redis client singleton for:
 * - Message rate limiting
 * - User presence tracking
 * - Socket.io pub/sub adapter
 * If REDIS_URL is not configured, redis features are disabled and the server runs in single-instance mode.
 */
export let redisClient: ReturnType<typeof createClient> | null = null;

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });

  // Log successful connection
  redisClient.on("connect", () => {
    console.log("✅ Redis connected successfully");
  });

  // Log connection errors
  redisClient.on("error", (error) => {
    console.error("❌ Redis connection error:", error);
  });
} else {
  console.warn(
    "⚠️ REDIS_URL not set. Redis features (rate-limiting, presence, pub/sub) are disabled.",
  );
}
