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
  keepAlive: true,
  keepAliveInitialDelay: 300000,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 1
};

// Connection state tracking
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;

async function connectWithRetry(retries = MAX_RETRIES) {
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB is already connected');
    return;
  }

  if (isConnecting) {
    console.log('Connection attempt already in progress...');
    return;
  }

  try {
    isConnecting = true;
    connectionAttempts++;
    
    console.log(`MongoDB Connection Attempt ${connectionAttempts}/${MAX_RETRIES}`);
    console.log('MongoDB URI format check:', MONGODB_URI.startsWith('mongodb+srv://'));
    
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('Connection State:', mongoose.connection.readyState);
    console.log('Database Name:', conn.connection.name);
    
    // Reset connection tracking on successful connection
    isConnecting = false;
    connectionAttempts = 0;

    // Set up connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected event fired');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected event fired');
      if (connectionAttempts < MAX_RETRIES) {
        console.log('Attempting to reconnect...');
        setTimeout(() => connectWithRetry(MAX_RETRIES), 5000);
      }
    });

  } catch (error) {
    isConnecting = false;
    console.error('MongoDB connection error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    if (retries > 0) {
      console.log(`Retrying connection in 5 seconds... (${retries} attempts remaining)`);
      setTimeout(() => connectWithRetry(retries - 1), 5000);
    } else {
      console.error('Max retries reached. Could not connect to MongoDB');
    }
  }
}

// Initial connection
connectWithRetry().catch(err => {
  console.error('Failed to connect to MongoDB after retries:', err);
});

// Middleware to check MongoDB connection
async function checkMongoConnection(req, res, next) {
  const state = mongoose.connection.readyState;
  const stateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][state];
  
  console.log(`MongoDB Connection State: ${stateText} (${state})`);
  
  if (state === 0) {
    // If disconnected, try to reconnect
    try {
      await connectWithRetry();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      state: mongoose.connection.readyState,
      stateText,
      attempts: connectionAttempts
    });
  }
  
  next();
}

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

// Test endpoint
router.get('/test', async (req, res) => {
  const state = mongoose.connection.readyState;
  const stateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][state];
  
  console.log('Test endpoint called');
  console.log('MongoDB URI present:', !!MONGODB_URI);
  console.log('MongoDB URI format:', MONGODB_URI.startsWith('mongodb+srv://'));
  console.log('Connection State:', state, `(${stateText})`);
  console.log('Connection Attempts:', connectionAttempts);
  
  try {
    if (state !== 1) {
      await connectWithRetry();
    }
    
    // Try to perform a simple database operation
    const count = await Memory.estimatedDocumentCount();
    
    res.json({
      status: 'success',
      connection: {
        state,
        stateText,
        attempts: connectionAttempts
      },
      database: {
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        memoryCount: count
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      status: 'error',
      connection: {
        state,
        stateText,
        attempts: connectionAttempts
      },
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    });
  }
});

// Mount routes
app.use('/.netlify/functions/api', router);
app.use('/api', router);

// Export handler
module.exports.handler = serverless(app);
