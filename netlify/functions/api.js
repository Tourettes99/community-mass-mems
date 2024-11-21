// API function for R1 Memories
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
  console.error('MONGODB_URI environment variable is not defined!');
  throw new Error('MONGODB_URI must be defined');
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
app.use(express.urlencoded({ extended: true }));

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
}).single('file'); // Configure for single file upload

// Custom error handling middleware
const handleUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        error: 'File upload error',
        details: err.message
      });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(500).json({
        error: 'Unknown upload error',
        details: err.message
      });
    }
    next();
  });
};

// Connect to MongoDB with detailed error logging
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 5 second timeout
})
.then(() => console.log('Successfully connected to MongoDB Atlas'))
.catch(err => {
  console.error('MongoDB connection error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  throw err; // Re-throw to fail fast if we can't connect
});

// Add connection error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Add disconnection handler
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Memory Schema
const memorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
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
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected. Current state: ' + mongoose.connection.readyState);
    }

    const memories = await Memory.find().sort({ timestamp: -1 });
    console.log('Found memories:', memories.length);
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ 
      error: error.message,
      mongoState: mongoose.connection.readyState,
      stack: error.stack
    });
  }
});

// Updated upload endpoint
router.post('/memories', handleUpload, async (req, res) => {
  console.log('POST /memories request received');
  console.log('Request body:', req.body);
  console.log('File:', req.file);
  
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected. Current state: ' + mongoose.connection.readyState);
    }

    if (!req.body.title || !req.body.description) {
      throw new Error('Title and description are required');
    }

    const memoryData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      content: req.body.content || '',
      timestamp: new Date()
    };

    // Handle file upload
    if (req.file) {
      console.log('Processing file upload:', req.file.originalname);
      memoryData.fileData = req.file.buffer;
      memoryData.fileName = req.file.originalname;
      memoryData.fileType = req.file.mimetype;
    }

    // Handle media URL
    if (req.body.mediaUrl) {
      console.log('Processing media URL:', req.body.mediaUrl);
      memoryData.mediaUrl = req.body.mediaUrl;
      memoryData.mediaType = req.body.mediaType || 'url';
    }

    console.log('Creating new memory with data:', {
      ...memoryData,
      fileData: req.file ? 'Buffer present' : 'No file data'
    });

    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    
    // Create a safe response object without the file buffer
    const response = {
      ...savedMemory.toObject(),
      fileData: savedMemory.fileData ? 'File data present' : undefined
    };

    console.log('Memory saved successfully');
    res.status(201).json(response);
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({
      error: error.message,
      mongoState: mongoose.connection.readyState,
      stack: error.stack
    });
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
  res.json({ 
    message: 'API is working!',
    mongoState: mongoose.connection.readyState
  });
});

app.use('/.netlify/functions/api', router);
app.use('/api', router);

module.exports.handler = serverless(app);
