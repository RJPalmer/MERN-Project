const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectMongo, disconnectMongo } = require('./db/mongo');
const { connectRedis, disconnectRedis } = require('./db/redis');

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'API server listening');
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down API server');

  const closeHttpServer = new Promise((resolve) => server.close(resolve));
  try {
    await Promise.allSettled([closeHttpServer, disconnectMongo(), disconnectRedis()]);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

Promise.allSettled([connectMongo(), connectRedis()]).then((results) => {
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(
        { err: result.reason, service: index === 0 ? 'mongodb' : 'redis' },
        'Initial connection failed',
      );
    }
  });
});

process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled promise rejection');
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  shutdown('uncaughtException');
});
