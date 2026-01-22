import { redisClient } from "../config/redis";

export const RATE_LIMIT_WINDOW = 10;
export const RATE_LIMIT_MAX = 5;

export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `rate:user:${userId}`;
  const current = await redisClient.incr(key);

  if (current === 1) {
    await redisClient.expire(key, RATE_LIMIT_WINDOW);
  }

  return current <= RATE_LIMIT_MAX;
}
