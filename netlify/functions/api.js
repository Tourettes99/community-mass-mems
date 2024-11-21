// API function for R1 Memories
// Updated with MongoDB Atlas connection and file upload handling
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

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
  tags: [String],
  content: String, // For text content
  fileData: Buffer, // For file storage
  fileName: String,
  fileType: String
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

router.post('/memories', upload.single('file'), async (req, res) => {
  console.log('POST /memories request received');
  try {
    const memoryData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      content: req.body.content || '',
      timestamp: new Date()
    };

    // If there's a file uploaded
    if (req.file) {
      memoryData.fileData = req.file.buffer;
      memoryData.fileName = req.file.originalname;
      memoryData.fileType = req.file.mimetype;
    }

    // If there's a mediaUrl
    if (req.body.mediaUrl) {
      memoryData.mediaUrl = req.body.mediaUrl;
      memoryData.mediaType = req.body.mediaType || 'url';
    }

    const memory = new Memory(memoryData);
    await memory.save();
    
    // Don't send the file buffer in the response
    const response = memory.toObject();
    delete response.fileData;
    
    console.log('Memory saved:', response);
    res.status(201).json(response);
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to serve files
router.get('/memories/:id/file', async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory || !memory.fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set('Content-Type', memory.fileType);
    res.send(memory.fileData);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

app.use('/', router);

module.exports.handler = serverless(app);
