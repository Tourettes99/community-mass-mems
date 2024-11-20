// API function for R1 Memories
// Updated with MongoDB Atlas connection
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const router = express.Router();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined');
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Memory Schema
const memorySchema = new mongoose.Schema({
  title: String,
  description: String,
  mediaUrl: String,
  mediaType: String,
  timestamp: { type: Date, default: Date.now },
  tags: [String]
});

const Memory = mongoose.model('Memory', memorySchema);

// Routes
router.get('/memories', async (req, res) => {
  console.log('GET /memories request received');
  try {
    const memories = await Memory.find().sort({ timestamp: -1 });
    console.log('Found memories:', memories.length);
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/memories', async (req, res) => {
  console.log('POST /memories request received', req.body);
  try {
    const memory = new Memory(req.body);
    await memory.save();
    console.log('Memory saved:', memory);
    res.status(201).json(memory);
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Use the router without the full path prefix
app.use('/', router);

// Export the handler
module.exports.handler = serverless(app);
