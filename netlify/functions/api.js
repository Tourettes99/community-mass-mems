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
console.log('MongoDB URI present:', !!MONGODB_URI);

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
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  autoIndex: true,
  authSource: 'admin'
};

// Connect to MongoDB with retry logic
let isConnecting = false;
const connectWithRetry = async (retries = 5, delay = 5000) => {
  if (isConnecting) {
    console.log('Already attempting to connect to MongoDB...');
    return;
  }

  isConnecting = true;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`MongoDB connection attempt ${i + 1} of ${retries}`);
      console.log('Connecting to:', MONGODB_URI.replace(/:([^:@]{8})[^:@]*@/, ':***@'));
      
      if (mongoose.connection.readyState === 1) {
        console.log('Already connected to MongoDB');
        isConnecting = false;
        return;
      }

      await mongoose.connect(MONGODB_URI, mongooseOptions);
      console.log('Successfully connected to MongoDB Atlas');
      isConnecting = false;
      return;
    } catch (err) {
      console.error('MongoDB connection error:', {
        attempt: i + 1,
        name: err.name,
        message: err.message,
        code: err.code
      });
      
      if (i === retries - 1) {
        isConnecting = false;
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
  if (!isConnecting) {
    setTimeout(() => connectWithRetry(), 5000);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  if (!isConnecting) {
    setTimeout(() => connectWithRetry(), 5000);
  }
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('connecting', () => {
  console.log('Connecting to MongoDB...');
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
const checkMongoConnection = async (req, res, next) => {
  console.log('Checking MongoDB connection state:', mongoose.connection.readyState);
  
  if (mongoose.connection.readyState === 0) {
    try {
      console.log('MongoDB disconnected, attempting to reconnect...');
      await connectWithRetry(3, 2000);
    } catch (error) {
      console.error('Failed to reconnect to MongoDB:', error);
      return res.status(503).json({
        error: 'Database connection unavailable',
        details: error.message,
        state: mongoose.connection.readyState
      });
    }
  }
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      state: mongoose.connection.readyState,
      stateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
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
router.get('/test', async (req, res) => {
  console.log('Test route called');
  console.log('Current MongoDB state:', mongoose.connection.readyState);
  
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, attempting to connect...');
      await connectWithRetry(3, 2000);
    }
    
    res.json({ 
      message: 'API is working!',
      mongoState: mongoose.connection.readyState,
      mongoStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      dbName: mongoose.connection.name,
      dbHost: mongoose.connection.host
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({
      error: 'Failed to connect to database',
      details: error.message,
      state: mongoose.connection.readyState
    });
  }
});

// Mount routes
app.use('/.netlify/functions/api', router);
app.use('/api', router);

// Export handler
module.exports.handler = serverless(app);
