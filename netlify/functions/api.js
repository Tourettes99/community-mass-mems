const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const router = express.Router();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/r1memories', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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
  try {
    const memories = await Memory.find().sort({ timestamp: -1 });
    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/memories', async (req, res) => {
  try {
    const memory = new Memory(req.body);
    await memory.save();
    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add the router to the app
app.use('/.netlify/functions/api', router);

// Export the handler
module.exports.handler = serverless(app);
