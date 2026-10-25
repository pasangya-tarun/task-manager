const mongoose = require('mongoose');
const env = require('./env');

let memoryServerInstance = null;

const connectDB = async (customUri) => {
  let uri = customUri || env.MONGODB_URI;

  if (process.env.USE_IN_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create();
    uri = memoryServerInstance.getUri();
    console.log(`ℹ️ [DEMO / DEV MODE] Started In-Memory MongoDB Server at: ${uri}`);
  }

  if (!uri) {
    throw new Error('Database URI is not provided. Set MONGODB_URI in .env or run with USE_IN_MEMORY_DB=true');
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    });

    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
