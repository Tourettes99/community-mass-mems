const mongoose = require('mongoose');
const serverless = require('serverless-http');
const express = require('express');

const app = express();
const router = express.Router();

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
};

router.get('/', async (req, res) => {
  try {
    // Get MongoDB connection status
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Try to connect if not connected
    if (state !== 1) {
      console.log('Attempting to connect to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    }

    // Return detailed connection info
    res.json({
      status: 'success',
      mongodb: {
        state: mongoose.connection.readyState,
        stateText: stateMap[mongoose.connection.readyState],
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      mongoState: mongoose.connection.readyState
    });
  }
});

app.use('/.netlify/functions/test-db', router);
app.use('/api/test-db', router);

module.exports.handler = serverless(app);
