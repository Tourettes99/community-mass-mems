const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const gifInfo = require('gif-info');
const musicMetadata = require('music-metadata');
const urlMetadata = require('url-metadata');

// Initialize express app
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create router
const router = express.Router();

// MongoDB Connection URL - ensure this is set in your Netlify environment variables
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables!');
  throw new Error('MONGODB_URI is required');
}

console.log('MongoDB URI exists:', !!MONGODB_URI);

// Memory types enum
const MEMORY_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  GIF: 'gif',
  AUDIO: 'audio',
  URL: 'url'
};

// Memory Schema
const memorySchema = new mongoose.Schema({
  title: String,
  description: String,
  type: {
    type: String,
    required: true,
    enum: Object.values(MEMORY_TYPES)
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Memory Model
const Memory = mongoose.model('Memory', memorySchema);

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'image/jpeg': true,
      'image/png': true,
      'image/gif': true,
      'audio/mpeg': true,
      'audio/wav': true,
      'audio/ogg': true
    };
    
    if (allowedTypes[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
}).single('file');

// MongoDB Connection Function
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'memories'
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    throw error;
  }
};

// Utility functions
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getImageMetadata = async (buffer) => {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format.toUpperCase(),
    size: buffer.length,
    aspectRatio: metadata.width / metadata.height
  };
};

const getGifMetadata = (buffer) => {
  const metadata = gifInfo(buffer);
  return {
    width: metadata.width,
    height: metadata.height,
    format: 'GIF',
    frames: metadata.images.length,
    duration: metadata.images[0].delay * metadata.images.length,
    size: buffer.length,
    aspectRatio: metadata.width / metadata.height
  };
};

const getAudioMetadata = async (buffer) => {
  const metadata = await musicMetadata.parseBuffer(buffer);
  return {
    format: metadata.format.container.toUpperCase(),
    duration: formatDuration(metadata.format.duration),
    bitrate: metadata.format.bitrate,
    sampleRate: metadata.format.sampleRate,
    channels: metadata.format.numberOfChannels,
    size: buffer.length
  };
};

// Routes
router.get('/memories', async (req, res) => {
  console.log('GET /memories endpoint hit');
  
  try {
    // Ensure DB connection
    await connectDB();
    
    console.log('Fetching memories from database...');
    const memories = await Memory.find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    console.log(`Found ${memories?.length || 0} memories`);
    
    if (!memories) {
      console.log('No memories found, returning empty array');
      return res.json([]);
    }

    // Transform metadata
    const transformedMemories = memories.map(memory => {
      try {
        const plainMetadata = {};
        if (memory.metadata) {
          for (const [key, value] of Object.entries(memory.metadata)) {
            plainMetadata[key] = value;
          }
        }
        return {
          ...memory,
          metadata: plainMetadata
        };
      } catch (err) {
        console.error('Error transforming memory:', err);
        return memory;
      }
    });

    console.log('Successfully transformed memories');
    res.json(transformedMemories);
  } catch (error) {
    console.error('Error in /memories endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch memories',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/memories/upload', upload, async (req, res) => {
  try {
    const { title, description, type } = req.body;
    let content = req.body.content;
    let metadata = new Map();

    // Handle different memory types
    if (type === MEMORY_TYPES.URL) {
      try {
        const urlData = await urlMetadata(content);
        metadata.set('title', urlData.title);
        metadata.set('description', urlData.description);
        metadata.set('image', urlData.image);
        metadata.set('siteName', urlData.siteName);
      } catch (error) {
        console.error('Error fetching URL metadata:', error);
      }
    } else if (req.file) {
      content = req.file.buffer.toString('base64');
      metadata.set('filename', req.file.originalname);
      metadata.set('mimetype', req.file.mimetype);

      try {
        let fileMetadata;
        if (type === MEMORY_TYPES.IMAGE) {
          fileMetadata = await getImageMetadata(req.file.buffer);
        } else if (type === MEMORY_TYPES.GIF) {
          fileMetadata = getGifMetadata(req.file.buffer);
        } else if (type === MEMORY_TYPES.AUDIO) {
          fileMetadata = await getAudioMetadata(req.file.buffer);
        }
        
        for (const [key, value] of Object.entries(fileMetadata)) {
          metadata.set(key, value);
        }
      } catch (error) {
        console.error('Error extracting file metadata:', error);
      }
    }

    const memory = new Memory({
      title,
      description,
      type,
      content,
      metadata
    });

    await memory.save();
    res.json(memory);
  } catch (error) {
    console.error('Error uploading memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mount routes
app.use('/.netlify/functions/api', router);

// Export handler
exports.handler = serverless(app);
