const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Initialize express app
const app = express();

// Debug logging middleware
app.use((req, res, next) => {
  console.log('\n🌐 Incoming Request:', new Date().toISOString());
  console.log('📍 Path:', req.path);
  console.log('📝 Method:', req.method);
  console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

    const state = mongoose.connection.readyState;
    let stateText;
    switch (state) {
      case 0: stateText = 'Disconnected'; break;
      case 1: stateText = 'Connected'; break;
      case 2: stateText = 'Connecting'; break;
      case 3: stateText = 'Disconnecting'; break;
      default: stateText = 'Unknown';
    }

    // Get database stats if connected
    let stats = null;
    if (state === 1) {
      try {
        stats = await mongoose.connection.db.stats();
        console.log('📈 Database Stats Retrieved');
      } catch (statsError) {
        console.error('❌ Error getting database stats:', statsError);
      }
    }

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      connection: {
        state: stateText,
        readyState: state,
        url: MONGODB_URI ? MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@') : 'Not configured',
        database: mongoose.connection.name,
        host: mongoose.connection.host
      }
    };

    if (stats) {
      response.stats = {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`
      };
    }

    console.log('✅ Sending connection test response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ MongoDB connection test error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    });
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
console.log('🔌 MongoDB URI present:', !!MONGODB_URI);

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined!');
  throw new Error('MONGODB_URI must be defined');
}

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority',
  authSource: 'admin',
  dbName: 'memories'
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
    isConnecting = true;
    connectionAttempts++;
    
    console.log(`🔄 MongoDB Connection Attempt ${connectionAttempts}/${MAX_RETRIES}`);
    console.log('🔌 Connection Options:', {
      uri: MONGODB_URI ? 'URI Present' : 'URI Missing',
      dbName: mongooseOptions.dbName,
      authSource: mongooseOptions.authSource
    });
    
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
    return false;
  }
}

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
    
    const { title = '', description = '', type } = req.body;
    let content, metadata;

    switch (type) {
      case MEMORY_TYPES.TEXT:
        content = req.body.content;
        metadata = {};
        break;
      
      case MEMORY_TYPES.URL:
        content = req.body.url || req.body.content; // Support both url and content fields
        metadata = await getUrlMetadata(content);
        break;
      
      case MEMORY_TYPES.IMAGE:
      case MEMORY_TYPES.GIF:
      case MEMORY_TYPES.AUDIO:
        if (!req.file) {
          throw new Error('No file uploaded');
        }
        
        content = req.file.buffer.toString('base64');
        
        if (type === MEMORY_TYPES.IMAGE) {
          metadata = await getImageMetadata(req.file.buffer, req.file.originalname);
        } else if (type === MEMORY_TYPES.GIF) {
          metadata = await getGifMetadata(req.file.buffer, req.file.originalname);
        } else {
          metadata = await getAudioMetadata(req.file.buffer, req.file.originalname);
        }
        break;
      
      default:
        throw new Error('Invalid memory type');
    }

    const memory = new Memory({
      title,
      description,
      type,
      content,
      metadata
    });

    await memory.save();
    
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
      message: error.message
    });
  }
});

router.get('/memories', async (req, res) => {
  try {
    const memories = await Memory.find()
      .select('-content')  // Exclude the content field
      .sort('-createdAt');
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        memories
      }
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message
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
