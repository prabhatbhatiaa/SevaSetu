const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sevasetu';

    // If USE_MEMORY_DB is explicitly true or testing
    if (process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test') {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        mongoUri = mongodInstance.getUri();
        console.log(`[Database] In-Memory MongoDB Server started at: ${mongoUri}`);
      } catch (memErr) {
        console.warn('[Database] Could not start In-Memory MongoDB, falling back to MONGO_URI:', memErr.message);
      }
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    
    // In dev mode, attempt memory DB fallback if local daemon wasn't reachable
    if (process.env.NODE_ENV === 'development' && !mongodInstance) {
      try {
        console.log('[Database] Attempting fallback to In-Memory MongoDB for local development...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memUri = mongodInstance.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[Database] Fallback In-Memory MongoDB Connected successfully at: ${memUri}`);
        return conn;
      } catch (fallbackErr) {
        console.error('[Database] Fallback In-Memory MongoDB also failed:', fallbackErr.message);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error('[Database] Disconnect Error:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
