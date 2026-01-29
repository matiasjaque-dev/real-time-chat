import { redisClient } from "../config/redis";

const ONLINE_USERS_KEY = "online:users"; // Redis Set of currently online user IDs
const USER_SOCKET_COUNT_PREFIX = "online:user:"; // Redis counter for each user's active sockets

// In-memory fallback when Redis is not available (single-instance mode)
const inMemoryOnline = new Set<string>();
const inMemorySocketCounts = new Map<string, number>();

/**
 * Add a user ID to the online users set
 * @param userId - User identifier to mark as online
 */
async function addOnlineUser(userId: string): Promise<void> {
  if (redisClient) {
    await redisClient.sAdd(ONLINE_USERS_KEY, userId);
    return;
  }

  inMemoryOnline.add(userId);
}

/**
 * Remove a user ID from the online users set
 * @param userId - User identifier to mark as offline
 */
async function removeOnlineUser(userId: string): Promise<void> {
  if (redisClient) {
    await redisClient.sRem(ONLINE_USERS_KEY, userId);
    return;
  }

  inMemoryOnline.delete(userId);
}

/**
 * Retrieve list of all currently online users
 * @returns Array of user IDs currently online
 */
export async function getOnlineUsers(): Promise<string[]> {
  if (redisClient) {
    return await redisClient.sMembers(ONLINE_USERS_KEY);
  }

  return Array.from(inMemoryOnline.values());
}

/**
 * Increment socket connection counter for a user (user connects)
 * Marks user online if this is their first connection
 * @param userId - User connecting
 */
export async function incUserSocket(userId: string): Promise<void> {
  const socketCountKey = `${USER_SOCKET_COUNT_PREFIX}${userId}`;

  if (redisClient) {
    await redisClient.incr(socketCountKey);
    await addOnlineUser(userId);
    return;
  }

  const current = inMemorySocketCounts.get(userId) ?? 0;
  inMemorySocketCounts.set(userId, current + 1);
  inMemoryOnline.add(userId);
}

/**
 * Decrement socket connection counter for a user (user disconnects)
 * Marks user offline only if they have no remaining active connections
 * @param userId - User disconnecting
 * @returns true if user is now offline, false if still has active connections
 */
export async function decUserSocket(userId: string): Promise<boolean> {
  const socketCountKey = `${USER_SOCKET_COUNT_PREFIX}${userId}`;

  if (redisClient) {
    const remainingConnections = await redisClient.decr(socketCountKey);

    // User is offline only when all socket connections have closed
    if (remainingConnections <= 0) {
      await redisClient.del(socketCountKey);
      await removeOnlineUser(userId);
      return true; // User transitioned to offline
    }

    return false; // User still has active connections
  }

  const current = (inMemorySocketCounts.get(userId) ?? 1) - 1;
  if (current <= 0) {
    inMemorySocketCounts.delete(userId);
    inMemoryOnline.delete(userId);
    return true;
  }

  inMemorySocketCounts.set(userId, current);
  return false;
}
