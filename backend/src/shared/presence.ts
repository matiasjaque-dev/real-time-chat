import { redisClient } from "../config/redis";

const ONLINE_SET_KEY = "online:users";

export async function addOnlineUser(userId: string) {
  await redisClient.sAdd(ONLINE_SET_KEY, userId);
}

export async function removeOnlineUser(userId: string) {
  await redisClient.sRem(ONLINE_SET_KEY, userId);
}

export async function getOnlineUsers(): Promise<string[]> {
  return await redisClient.sMembers(ONLINE_SET_KEY);
}

export async function incUserSocket(userId: string) {
  await redisClient.incr(`online:user:${userId}`);
  await addOnlineUser(userId);
}

export async function decUserSocket(userId: string) {
  const key = `online:user:${userId}`;
  const newVal = await redisClient.decr(key);
  if (newVal <= 0) {
    await redisClient.del(key);
    await removeOnlineUser(userId);
    return true; // pasó a offline
  }
  return false; // sigue online
}
