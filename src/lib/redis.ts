import Redis from "ioredis";

declare global {
  var _redisClient: Redis | undefined;
}

function createClient() {
  const { REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD } = process.env;
  if (!REDIS_HOST || !REDIS_PORT) {
    throw new Error("REDIS_HOST/REDIS_PORT are not set");
  }
  return new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
  });
}

export const redis = global._redisClient ?? createClient();
global._redisClient = redis;
