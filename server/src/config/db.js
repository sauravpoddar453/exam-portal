const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/exam-portal';
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('[Database] Fatal error: Unable to connect to MongoDB in production mode. Exiting process.');
      process.exit(1);
    } else {
      console.log('[Database] Server will continue running. Ensure MongoDB is running or configure MONGO_URI in server/.env');
    }
  }
};

const getDBStatus = () => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  return states[mongoose.connection.readyState] || 'Unknown';
};

module.exports = { connectDB, getDBStatus };
