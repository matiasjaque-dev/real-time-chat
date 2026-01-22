import { redisClient } from "../config/redis";

/**
 * Rate limiting configuration for chat messages
 * Prevents spam by limiting messages per user per time window
 */
export const RATE_LIMIT_WINDOW_SECONDS = 10; // Time window in seconds
export const RATE_LIMIT_MAX_MESSAGES = 5; // Max messages allowed per window

/**
 * Check if user has exceeded message rate limit
 * Uses Redis counter with sliding window approach
 * @param userId - User identifier to check
 * @returns true if user is allowed to send a message, false if rate limited
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const rateLimitKey = `rate-limit:user:${userId}`;
  const currentMessageCount = await redisClient.incr(rateLimitKey);

  // Set expiration on first increment of the window
  if (currentMessageCount === 1) {
    await redisClient.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  }

  return currentMessageCount <= RATE_LIMIT_MAX_MESSAGES;
}
