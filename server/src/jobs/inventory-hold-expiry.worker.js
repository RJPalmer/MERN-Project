const env = require('../config/env');
const logger = require('../config/logger');
const { connectMongo, disconnectMongo } = require('../db/mongo');
const { releaseExpiredHolds } = require('../modules/inventory/hold.service');

let stopping = false;
let timer = null;
let activeRun = null;

async function runCycle() {
  try {
    const result = await releaseExpiredHolds({ limit: env.INVENTORY_HOLD_BATCH_SIZE });
    if (result.released > 0 || result.skipped > 0) {
      logger.info(result, 'Processed expired inventory holds');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to process expired inventory holds');
  }
}

function scheduleNextCycle() {
  if (stopping) return;
  timer = setTimeout(() => {
    activeRun = runCycle().finally(() => {
      activeRun = null;
      scheduleNextCycle();
    });
  }, env.INVENTORY_HOLD_POLL_INTERVAL_MS);
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (timer) clearTimeout(timer);
  logger.info({ signal }, 'Shutting down inventory hold worker');
  try {
    if (activeRun) await activeRun;
    await disconnectMongo();
  } catch (error) {
    logger.error({ err: error }, 'Error while stopping inventory hold worker');
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function start() {
  await connectMongo();
  logger.info(
    {
      intervalMs: env.INVENTORY_HOLD_POLL_INTERVAL_MS,
      batchSize: env.INVENTORY_HOLD_BATCH_SIZE,
    },
    'Inventory hold worker started',
  );
  activeRun = runCycle();
  await activeRun;
  activeRun = null;
  scheduleNextCycle();
}

start().catch(async (error) => {
  logger.fatal({ err: error }, 'Inventory hold worker failed to start');
  process.exitCode = 1;
  await shutdown('startup failure');
});
