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

// Memory types enum
const MEMORY_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  GIF: 'gif',
  AUDIO: 'audio',
  URL: 'url'
};

// Configure multer for serverless environment
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'image/jpeg': MEMORY_TYPES.IMAGE,
      'image/png': MEMORY_TYPES.IMAGE,
      'image/gif': MEMORY_TYPES.GIF,
      'audio/mpeg': MEMORY_TYPES.AUDIO,
      'audio/wav': MEMORY_TYPES.AUDIO,
      'audio/ogg': MEMORY_TYPES.AUDIO
    };

    if (!allowedTypes[file.mimetype]) {
      return cb(new Error('File type not allowed'), false);
    }

    file.memoryType = allowedTypes[file.mimetype];
    cb(null, true);
  }
}).single('file');

// Promisify multer middleware
const uploadMiddleware = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        reject(err);
      }
      resolve();
    });
  });
};

// Utility function to get image metadata
async function getImageMetadata(buffer, filename) {
  const sharp = require('sharp');
  const image = sharp(buffer);
  const metadata = await image.metadata();

  return {
    filename,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    fileSize: buffer.length
  };
}

// Utility function to get GIF metadata
async function getGifMetadata(buffer, filename) {
  const gifInfo = require('gif-info');
  const info = gifInfo(buffer);

  return {
    filename,
    format: 'gif',
    width: info.width,
    height: info.height,
    frameCount: info.images,
    fps: Math.round(100 / info.duration * info.images) / 100,
    fileSize: buffer.length
  };
}

// Utility function to get audio metadata
async function getAudioMetadata(buffer, filename) {
  const musicMetadata = require('music-metadata');
  const metadata = await musicMetadata.parseBuffer(buffer);

  return {
    filename,
    format: metadata.format.container,
    duration: formatDuration(metadata.format.duration),
    bitrate: metadata.format.bitrate,
    sampleRate: metadata.format.sampleRate,
    fileSize: buffer.length
  };
}

// Utility function to get URL metadata
async function getUrlMetadata(url) {
  const urlMetadata = require('url-metadata');
  const metadata = await urlMetadata(url);

  return {
    siteName: metadata.siteName || new URL(url).hostname,
    siteIcon: metadata.favicon,
    previewImage: metadata.image,
    urlDescription: metadata.description
  };
}

// Utility function to format duration
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Memory Schema
const memorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: Object.values(MEMORY_TYPES),
    default: MEMORY_TYPES.TEXT
  },
  content: {
    text: String,
    fileUrl: String,
    originalFilename: String
  },
  metadata: {
    // Common metadata
    filename: String,
    format: String,
    fileSize: Number,

    // Image/GIF metadata
    width: Number,
    height: Number,
    frameCount: Number,
    fps: Number,

    // Audio metadata
    duration: String,
    bitrate: Number,
    sampleRate: Number,

    // URL metadata
    siteName: String,
    siteIcon: String,
    previewImage: String,
    urlDescription: String
  }
}, {
  timestamps: true
});

const Memory = mongoose.model('Memory', memorySchema);

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Reduced timeout
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 1,
  minPoolSize: 1
};

// Connection state tracking
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

async function connectWithRetry(retries = MAX_RETRIES) {
  if (mongoose.connection.readyState === 1) {
    console.log('MongoDB is already connected');
    return true;
  }

  // If we're stuck in connecting state for too long, force a disconnect
  if (mongoose.connection.readyState === 2 && isConnecting) {
    console.log('Stuck in connecting state, forcing disconnect...');
    try {
      await mongoose.disconnect();
    } catch (err) {
      console.error('Error during forced disconnect:', err);
    }
  }

  if (isConnecting) {
    console.log('Connection attempt already in progress...');
    return false;
  }

  try {
    isConnecting = true;
    connectionAttempts++;
    
    console.log(`MongoDB Connection Attempt ${connectionAttempts}/${MAX_RETRIES}`);
    console.log('Connection Options:', {
      uri: MONGODB_URI ? 'URI Present' : 'URI Missing',
      format: MONGODB_URI?.startsWith('mongodb+srv://') ? 'Valid Format' : 'Invalid Format'
    });
    
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing connection...');
      await mongoose.disconnect();
    }

    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('Connection State:', mongoose.connection.readyState);
    console.log('Database Name:', conn.connection.name);
    
    isConnecting = false;
    connectionAttempts = 0;

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected event fired');
      isConnecting = false;
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnecting = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected event fired');
      isConnecting = false;
    });

    return true;

  } catch (error) {
    console.error('MongoDB connection error:', {
      name: error.name,
      message: error.message,
      code: error.code
    });

    isConnecting = false;

    if (retries > 0) {
      console.log(`Retrying connection in 3 seconds... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return connectWithRetry(retries - 1);
    } else {
      console.error('Max retries reached. Could not connect to MongoDB');
      return false;
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
  
  console.log(`MongoDB Connection Check - State: ${stateText} (${state})`);
  
  // If stuck in connecting state for too long or disconnected, try to reconnect
  if (state === 2 || state === 0) {
    console.log('Attempting to establish connection...');
    const connected = await connectWithRetry();
    
    if (!connected) {
      return res.status(503).json({
        error: 'Database connection unavailable',
        state: mongoose.connection.readyState,
        stateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
        attempts: connectionAttempts,
        message: 'Failed to establish database connection after multiple attempts'
      });
    }
  }
  
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database connection unavailable',
      state: mongoose.connection.readyState,
      stateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
      attempts: connectionAttempts
    });
  }
  
  next();
}

// Routes
router.use(checkMongoConnection);

// Handle file uploads
router.post('/memories', async (req, res) => {
  try {
    // Handle file upload if present
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      await uploadMiddleware(req, res);
    }

    const { title, description, text, url } = req.body;
    console.log('Received memory request:', { title, description, hasFile: !!req.file });

    if (!title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description'],
        received: { title: !!title, description: !!description }
      });
    }

    let memoryData = {
      title: title.trim(),
      description: description.trim(),
      timestamp: new Date()
    };

    // Handle different content types
    if (req.file) {
      const file = req.file;
      console.log('Processing file:', { 
        name: file.originalname, 
        type: file.memoryType, 
        size: file.size 
      });

      let metadata;
      try {
        if (file.memoryType === MEMORY_TYPES.GIF) {
          metadata = await getGifMetadata(file.buffer, file.originalname);
        } else if (file.memoryType === MEMORY_TYPES.IMAGE) {
          metadata = await getImageMetadata(file.buffer, file.originalname);
        } else if (file.memoryType === MEMORY_TYPES.AUDIO) {
          metadata = await getAudioMetadata(file.buffer, file.originalname);
        }
      } catch (metadataError) {
        console.error('Metadata extraction error:', metadataError);
      }

      memoryData.type = file.memoryType;
      memoryData.fileData = file.buffer;
      memoryData.metadata = metadata || {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      };

    } else if (url) {
      console.log('Processing URL memory:', url);
      const metadata = await getUrlMetadata(url);
      memoryData.type = MEMORY_TYPES.URL;
      memoryData.content = { url };
      memoryData.metadata = metadata;

    } else if (text) {
      console.log('Processing text memory');
      memoryData.type = MEMORY_TYPES.TEXT;
      memoryData.content = { text };
    } else {
      return res.status(400).json({
        error: 'No content provided',
        message: 'Please provide either a file, URL, or text content'
      });
    }

    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    console.log('Memory saved successfully:', savedMemory._id);

    // Remove binary data from response
    const response = savedMemory.toObject();
    delete response.fileData;

    res.status(201).json(response);
  } catch (error) {
    console.error('Memory creation error:', error);
    res.status(500).json({
      error: 'Failed to create memory',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route to serve files
router.get('/files/:filename', async (req, res) => {
  try {
    const memory = await Memory.findOne({ 'content.originalFilename': req.params.filename });
    
    if (!memory || !memory.fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set('Content-Type', memory.metadata.format);
    res.send(memory.fileData);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
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

// Add test endpoint for MongoDB connection
router.get('/test-connection', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    let stateText;
    switch (state) {
      case 0: stateText = 'Disconnected'; break;
      case 1: stateText = 'Connected'; break;
      case 2: stateText = 'Connecting'; break;
      case 3: stateText = 'Disconnecting'; break;
      default: stateText = 'Unknown';
    }

    // Get database stats
    const stats = await mongoose.connection.db.stats();
    
    res.json({
      status: 'success',
      connection: {
        state: stateText,
        url: MONGODB_URI ? MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@') : 'Not configured',
        database: mongoose.connection.name,
        host: mongoose.connection.host
      },
      stats: {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`
      }
    });
  } catch (error) {
    console.error('MongoDB connection test error:', error);
    res.status(500).json({
      status: 'error',
      error: {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// Add comprehensive database test endpoint
router.get('/test-db', async (req, res) => {
  try {
    // 1. Check connection status
    const state = mongoose.connection.readyState;
    let stateText;
    switch (state) {
      case 0: stateText = 'Disconnected'; break;
      case 1: stateText = 'Connected'; break;
      case 2: stateText = 'Connecting'; break;
      case 3: stateText = 'Disconnecting'; break;
      default: stateText = 'Unknown';
    }

    // 2. Get database stats
    const stats = await mongoose.connection.db.stats();
    
    // 3. Test CRUD operations
    const TestModel = mongoose.model('Test', new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    }));

    // Create
    const testDoc = await TestModel.create({
      message: 'Test document ' + new Date().toISOString()
    });

    // Read
    const foundDoc = await TestModel.findById(testDoc._id);

    // Delete
    await TestModel.findByIdAndDelete(testDoc._id);

    res.json({
      status: 'success',
      connection: {
        state: stateText,
        url: MONGODB_URI ? MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@') : 'Not configured',
        database: mongoose.connection.name,
        host: mongoose.connection.host
      },
      stats: {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`
      },
      testResults: {
        createSuccess: !!testDoc,
        readSuccess: !!foundDoc,
        dataMatch: foundDoc?.message === testDoc?.message,
        deleteSuccess: true
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    });
  }
});

// Mount routes
app.use('/', router);

// Export handler
module.exports.handler = serverless(app);
