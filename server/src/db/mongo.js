const mongoose = require('mongoose');
const logger = require('../config/logger');
const env = require('../config/env');

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'MongoDB connection error');
});

async function connectMongo() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  logger.info('Connected to MongoDB');
}

async function disconnectMongo() {
  await mongoose.disconnect();
}

function getMongoStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

module.exports = { connectMongo, disconnectMongo, getMongoStatus };
