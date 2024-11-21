const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Initialize express app
const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://r1memories.com',
  'https://shiny-jalebi-9ccb2b.netlify.app',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Enable CORS with options
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug logging middleware
app.use((req, res, next) => {
  console.log('\n🌐 Incoming Request:', new Date().toISOString());
  console.log('📍 Path:', req.path);
  console.log('📝 Method:', req.method);
  console.log('🔑 Origin:', req.headers.origin);
  console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Create router for API endpoints
const router = express.Router();

// Root endpoint (health check)
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/.netlify/functions/api/test-connection',
      memories: '/.netlify/functions/api/memories',
      upload: '/.netlify/functions/api/memories/upload'
    }
  });
});

// Test connection endpoint
router.get('/test-connection', async (req, res) => {
  console.log('🔌 Test connection endpoint hit');
  try {
    // Ensure MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      await connectWithRetry();
    }

    res.json({
      status: 'success',
      message: 'Connected to database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ MongoDB connection test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database',
      timestamp: new Date().toISOString()
    });
  }
});

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  throw new Error('MONGODB_URI is required');
}

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4,
  retryWrites: true,
  w: 'majority',
  authSource: 'admin',
  dbName: 'memories',
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

// MongoDB connection with retry logic
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

async function connectWithRetry(retries = MAX_RETRIES) {
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB is already connected');
    return true;
  }

  try {
    if (isConnecting) {
      console.log('⏳ Connection attempt already in progress...');
      return false;
    }

    isConnecting = true;
    connectionAttempts++;
    
    console.log(`🔄 MongoDB Connection Attempt ${connectionAttempts}/${MAX_RETRIES}`);
    
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log('✅ MongoDB Connected');
    console.log('📊 Connection State:', mongoose.connection.readyState);
    console.log('📁 Database:', mongoose.connection.db.databaseName);
    
    isConnecting = false;
    connectionAttempts = 0;
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    isConnecting = false;
    
    if (retries > 0) {
      console.log(`⏰ Retrying connection in 3 seconds... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return connectWithRetry(retries - 1);
    }

    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}

// Connect to MongoDB on startup
connectWithRetry().catch(error => {
  console.error('❌ Initial MongoDB connection failed:', error.message);
});

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
  const metadata = await sharp(buffer).metadata();
  
  return {
    filename: filename,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format.toUpperCase(),
    fileSize: buffer.length,
    aspectRatio: metadata.width / metadata.height
  };
}

// Utility function to get GIF metadata
async function getGifMetadata(buffer, filename) {
  const gifInfo = require('gif-info');
  const metadata = gifInfo(buffer);
  
  return {
    filename: filename,
    width: metadata.width,
    height: metadata.height,
    format: 'GIF',
    frames: metadata.images.length,
    fps: Math.round(1000 / metadata.images[0].delay) || 0,
    duration: formatDuration((metadata.images.length * metadata.images[0].delay) / 1000),
    fileSize: buffer.length,
    aspectRatio: metadata.width / metadata.height
  };
}

// Utility function to get audio metadata
async function getAudioMetadata(buffer, filename) {
  const musicMetadata = require('music-metadata');
  const metadata = await musicMetadata.parseBuffer(buffer);
  
  return {
    filename: filename,
    format: metadata.format.container.toUpperCase(),
    duration: formatDuration(metadata.format.duration),
    bitrate: metadata.format.bitrate,
    sampleRate: metadata.format.sampleRate,
    channels: metadata.format.numberOfChannels,
    fileSize: buffer.length,
    title: metadata.common.title,
    artist: metadata.common.artist
  };
}

// Utility function to get URL metadata
async function getUrlMetadata(url) {
  const urlMetadata = require('url-metadata');
  const metadata = await urlMetadata(url);
  
  return {
    title: metadata.title || new URL(url).hostname,
    siteName: metadata.siteName || new URL(url).hostname,
    description: metadata.description,
    previewImage: metadata.image,
    siteIcon: metadata.favicon,
    url: url,
    type: metadata.type || 'website',
    author: metadata.author,
    publishedDate: metadata.publishedDate
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
  title: { 
    type: String,
    default: '' // Make title optional with empty default
  },
  description: { 
    type: String,
    default: '' // Make description optional with empty default
  },
  type: { 
    type: String, 
    required: true,
    enum: Object.values(MEMORY_TYPES)
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  content: {
    type: String,
    required: true
  },
  createdAt: { 
    type: Date,
    default: Date.now 
  },
  updatedAt: { 
    type: Date,
    default: Date.now 
  }
});

const Memory = mongoose.model('Memory', memorySchema);

// Memory routes
router.post('/memories', async (req, res) => {
  try {
    await uploadMiddleware(req, res);
    
    console.log('📦 Memory Upload Request');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    if (!req.body.type) {
      throw new Error('Memory type is required');
    }

    const { title = '', description = '', type } = req.body;
    let content, metadata = {};

    switch (type) {
      case MEMORY_TYPES.TEXT:
        console.log('Processing TEXT memory');
        content = req.body.content;
        if (!content) {
          throw new Error('Content is required for text memories');
        }
        break;
      
      case MEMORY_TYPES.URL:
        console.log('Processing URL memory');
        content = req.body.content;
        if (!content) {
          throw new Error('URL is required for URL memories');
        }
        try {
          metadata = await getUrlMetadata(content);
        } catch (error) {
          console.error('Error getting URL metadata:', error);
          // Continue even if metadata extraction fails
        }
        break;
      
      case MEMORY_TYPES.IMAGE:
      case MEMORY_TYPES.GIF:
      case MEMORY_TYPES.AUDIO:
        console.log(`Processing ${type.toUpperCase()} memory`);
        if (!req.file) {
          throw new Error(`File is required for ${type} memories`);
        }
        
        content = req.file.buffer.toString('base64');
        
        try {
          if (type === MEMORY_TYPES.IMAGE) {
            metadata = await getImageMetadata(req.file.buffer, req.file.originalname);
          } else if (type === MEMORY_TYPES.GIF) {
            metadata = await getGifMetadata(req.file.buffer, req.file.originalname);
          } else {
            metadata = await getAudioMetadata(req.file.buffer, req.file.originalname);
          }
        } catch (error) {
          console.error('Error getting file metadata:', error);
          // Continue even if metadata extraction fails
          metadata = {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
          };
        }
        break;
      
      default:
        throw new Error(`Invalid memory type: ${type}`);
    }

    if (!content) {
      throw new Error('Content is required');
    }

    console.log('Creating memory with:', {
      type,
      title: title || '[empty]',
      description: description || '[empty]',
      hasContent: !!content,
      metadata: Object.keys(metadata)
    });

    const memory = new Memory({
      title,
      description,
      type,
      content,
      metadata
    });

    await memory.save();
    
    console.log('Memory saved successfully');
    
    res.status(201).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        memory: {
          id: memory._id,
          title: memory.title,
          description: memory.description,
          type: memory.type,
          metadata: memory.metadata,
          createdAt: memory.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(400).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message || 'Failed to create memory',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/memories', async (req, res) => {
  try {
    // Set CORS headers explicitly for this route
    res.header('Access-Control-Allow-Origin', allowedOrigins);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);

    // Ensure MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      await connectWithRetry();
    }

    const memories = await Memory.find().sort({ createdAt: -1 });
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({
      error: 'Failed to fetch memories',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/memories/:id', async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    
    if (!memory) {
      return res.status(404).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Memory not found'
      });
    }
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        memory
      }
    });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

// Upload endpoint
router.post('/memories/upload', async (req, res) => {
  try {
    // Set CORS headers explicitly for this route
    res.header('Access-Control-Allow-Origin', allowedOrigins);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);

    // Rest of the upload logic...
  } catch (error) {
    console.error('Error uploading memory:', error);
    res.status(400).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message || 'Failed to upload memory',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Mount all routes with consistent prefix
app.use('/.netlify/functions/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    timestamp: new Date().toISOString(),
    message: err.message || 'Internal server error',
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create handler
const handler = serverless(app);

// Export the handler function
exports.handler = async (event, context) => {
  // Log the incoming request
  console.log('🌐 Incoming request:', {
    path: event.path,
    httpMethod: event.httpMethod,
    headers: event.headers
  });

  // Ensure MongoDB is connected before handling the request
  if (mongoose.connection.readyState !== 1) {
    console.log('📡 Connecting to MongoDB before handling request...');
    await connectWithRetry();
  }

  try {
    // Handle the request
    const result = await handler(event, context);
    
    // Log the response
    console.log('📤 Response:', {
      statusCode: result.statusCode,
      headers: result.headers
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error handling request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
