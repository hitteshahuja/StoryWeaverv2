const { createClient } = require('redis');

const createRedisClient = async () => {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 443;
  const password = process.env.REDIS_PASSWORD;

  console.log('[Redis] Config:', { host, port, hasPassword: !!password, username: process.env.REDIS_USERNAME });

  if (!host) {
    console.log('[Redis] REDIS_HOST not configured - caching disabled');
    return null;
  }

  const isTls = port === 443 || process.env.REDIS_TLS === 'true';
  
  const client = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: password || undefined,
    socket: {
      host,
      port,
      tls: isTls ? {} : undefined,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.log('[Redis] Max retries reached, giving up');
          return new Error('Max retries reached');
        }
        return Math.min(retries * 200, 1000);
      }
    }
  });

  client.on('error', err => console.log('[Redis] Client Error:', err.message));
  client.on('connect', () => console.log('[Redis] Socket connected'));
  client.on('ready', () => console.log('[Redis] Connected and ready'));
  client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

  try {
    await client.connect();
    console.log('[Redis] Connection established');
    return client;
  } catch (err) {
    console.log('[Redis] Connection failed:', err.message);
    return null;
  }
};

const redisClient = createRedisClient();

const redisWrapper = {
  async get(key) {
    const client = await redisClient;
    if (!client) return null;
    try {
      return await client.get(key);
    } catch (e) {
      console.error('[Redis] GET error:', e.message);
      return null;
    }
  },
  async setEx(key, ttl, value) {
    const client = await redisClient;
    if (!client) return;
    try {
      await client.setEx(key, ttl, value);
    } catch (e) {
      console.error('[Redis] SET error:', e.message);
    }
  },
  async del(key) {
    const client = await redisClient;
    if (!client) return;
    try {
      await client.del(key);
    } catch (e) {
      console.error('[Redis] DEL error:', e.message);
    }
  }
};

module.exports = redisWrapper;
