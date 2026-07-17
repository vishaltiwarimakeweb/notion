import Redis from "ioredis";

declare global {
  var _redisClient: Redis | undefined;
}

function createClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return new Redis(url);
}

export const redis = global._redisClient ?? createClient();
global._redisClient = redis;
