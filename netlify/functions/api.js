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

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10,
  connectTimeoutMS: 10000,
  retryWrites: true,
};

// Connect to MongoDB with retry logic
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`MongoDB connection attempt ${i + 1} of ${retries}`);
      await mongoose.connect(MONGODB_URI, mongooseOptions);
      console.log('Successfully connected to MongoDB Atlas');
      return;
    } catch (err) {
      console.error('MongoDB connection error:', {
        attempt: i + 1,
        name: err.name,
        message: err.message,
        code: err.code
      });
      
      if (i === retries - 1) {
        throw err;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Initial connection
connectWithRetry().catch(err => {
  console.error('Failed to connect to MongoDB after retries:', err);
});

// Add connection monitoring
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  connectWithRetry().catch(err => {
    console.error('Failed to reconnect to MongoDB:', err);
  });
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
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
}, {
  timestamps: true
});

const Memory = mongoose.model('Memory', memorySchema);

// Middleware to check MongoDB connection
const checkMongoConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
    return res.status(503).json({
      error: 'Database connection unavailable',
      state: mongoose.connection.readyState
    });
  }
  next();
};

// Routes
router.use(checkMongoConnection);

router.get('/memories', async (req, res) => {
  console.log('GET /memories request received');
  try {
    const memories = await Memory.find()
      .select('-fileData') // Exclude file data from response
      .sort({ timestamp: -1 });
    console.log('Found memories:', memories.length);
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

// Updated upload endpoint
router.post('/memories', handleUpload, async (req, res) => {
  console.log('POST /memories request received');
  console.log('Request body:', req.body);
  console.log('File:', req.file ? {
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');
  
  try {
    if (!req.body.title || !req.body.description) {
      throw new Error('Title and description are required');
    }

    const memoryData = {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
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
      memoryData.mediaUrl = req.body.mediaUrl.trim();
      memoryData.mediaType = req.body.mediaType || 'url';
    }

    console.log('Creating new memory with data:', {
      ...memoryData,
      fileData: req.file ? `${req.file.size} bytes` : undefined
    });

    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    
    // Create a safe response object without the file buffer
    const response = savedMemory.toObject();
    if (response.fileData) {
      response.fileData = 'File data present';
    }

    console.log('Memory saved successfully');
    res.status(201).json(response);
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({
      error: error.message,
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

// Test route with detailed status
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    mongoState: mongoose.connection.readyState,
    mongoStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/.netlify/functions/api', router);
app.use('/api', router);

// Export handler
module.exports.handler = serverless(app);
