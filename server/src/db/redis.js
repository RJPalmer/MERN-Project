const Redis = require('ioredis');
const logger = require('../config/logger');
const env = require('../config/env');

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 250, 5000),
});

redis.on('error', (error) => {
  logger.error({ err: error }, 'Redis connection error');
});

redis.on('ready', () => logger.info('Connected to Redis'));

async function connectRedis() {
  await redis.connect();
}

async function disconnectRedis() {
  if (redis.status !== 'end') await redis.quit();
}

function getRedisStatus() {
  return redis.status === 'ready' ? 'connected' : 'disconnected';
}

module.exports = { connectRedis, disconnectRedis, getRedisStatus };
