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

function isValidRedisUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
  } catch {
    return false;
  }
}

if (isValidRedisUrl(REDIS_URL)) {
  try {
    redisClient = createClient({ url: REDIS_URL });

    // Log successful connection
    redisClient.on("connect", () => {
      console.log("✅ Redis connected successfully");
    });

    // Log connection errors
    redisClient.on("error", (error) => {
      console.error("❌ Redis connection error:", error);
    });

    // Attempt to connect and handle failures gracefully
    (async () => {
      try {
        await redisClient?.connect();
      } catch (error) {
        console.error("❌ Redis connection error:", error);
        redisClient = null;
        console.warn(
          "⚠️ Redis disabled due to connection error; running in single-instance mode.",
        );
      }
    })();
  } catch (error) {
    console.error("❌ Failed to initialize Redis client:", error);
    redisClient = null;
    console.warn("⚠️ Continuing without Redis (single-instance mode).");
  }
} else {
  if (REDIS_URL) {
    console.error(
      "❌ REDIS_URL is invalid. Expected scheme redis:// or rediss://. Redis features are disabled.",
    );
  } else {
    console.warn(
      "⚠️ REDIS_URL not set. Redis features (rate-limiting, presence, pub/sub) are disabled.",
    );
  }
}
