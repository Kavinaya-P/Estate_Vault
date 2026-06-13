const mongoose = require('mongoose');
const { logger } = require('./logger');

const hasDbInMongoUri = (uri = '') => {
  const withoutQuery = uri.split('?')[0];
  const match = withoutQuery.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/(.*)$/i);
  if (!match) return false;
  return !!(match[1] && match[1].trim());
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set.');

    const options = { serverSelectionTimeoutMS: 5000 };
    if (!hasDbInMongoUri(mongoUri)) {
      options.dbName = process.env.MONGO_DB_NAME || 'estate_vault';
    }

    const conn = await mongoose.connect(mongoUri, options);
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected.');
});

module.exports = connectDB;
