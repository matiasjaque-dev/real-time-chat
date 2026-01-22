import { redisClient } from "../config/redis";

const ONLINE_USERS_KEY = "online:users"; // Redis Set of currently online user IDs
const USER_SOCKET_COUNT_PREFIX = "online:user:"; // Redis counter for each user's active sockets

/**
 * User presence tracking system
 * Tracks online users via Redis:
 * - ONLINE_USERS_KEY: Set of all online user IDs
 * - USER_SOCKET_COUNT_PREFIX:userId: Counter of active socket connections per user
 *
 * This supports multiple concurrent connections per user (mobile + web, multiple tabs, etc.)
 * User is considered offline only when all socket connections disconnect
 */

/**
 * Add a user ID to the online users set
 * @param userId - User identifier to mark as online
 */
async function addOnlineUser(userId: string): Promise<void> {
  await redisClient.sAdd(ONLINE_USERS_KEY, userId);
}

/**
 * Remove a user ID from the online users set
 * @param userId - User identifier to mark as offline
 */
async function removeOnlineUser(userId: string): Promise<void> {
  await redisClient.sRem(ONLINE_USERS_KEY, userId);
}

/**
 * Retrieve list of all currently online users
 * @returns Array of user IDs currently online
 */
export async function getOnlineUsers(): Promise<string[]> {
  return await redisClient.sMembers(ONLINE_USERS_KEY);
}

/**
 * Increment socket connection counter for a user (user connects)
 * Marks user online if this is their first connection
 * @param userId - User connecting
 */
export async function incUserSocket(userId: string): Promise<void> {
  const socketCountKey = `${USER_SOCKET_COUNT_PREFIX}${userId}`;
  await redisClient.incr(socketCountKey);
  await addOnlineUser(userId);
}

/**
 * Decrement socket connection counter for a user (user disconnects)
 * Marks user offline only if they have no remaining active connections
 * @param userId - User disconnecting
 * @returns true if user is now offline, false if still has active connections
 */
export async function decUserSocket(userId: string): Promise<boolean> {
  const socketCountKey = `${USER_SOCKET_COUNT_PREFIX}${userId}`;
  const remainingConnections = await redisClient.decr(socketCountKey);

  // User is offline only when all socket connections have closed
  if (remainingConnections <= 0) {
    await redisClient.del(socketCountKey);
    await removeOnlineUser(userId);
    return true; // User transitioned to offline
  }

  return false; // User still has active connections
}
