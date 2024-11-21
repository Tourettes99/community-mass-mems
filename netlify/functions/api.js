const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Initialize express app
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create router
const router = express.Router();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'memories'
}).then(() => {
  console.log('✅ MongoDB Connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Memory types enum
const MEMORY_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  GIF: 'gif',
  AUDIO: 'audio',
  URL: 'url'
};

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
    of: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Memory = mongoose.model('Memory', memorySchema);

// Routes
router.get('/memories', async (req, res) => {
  try {
    const memories = await Memory.find().sort({ createdAt: -1 });
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/memories/upload', upload, async (req, res) => {
  try {
    const { title, description, type, content } = req.body;
    
    const memory = new Memory({
      title,
      description,
      type,
      content,
      metadata: {}
    });

    if (req.file) {
      memory.metadata.set('filename', req.file.originalname);
      memory.metadata.set('size', req.file.size);
      memory.metadata.set('mimetype', req.file.mimetype);
    }

    await memory.save();
    res.json(memory);
  } catch (error) {
    console.error('Error uploading memory:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mount routes
app.use('/.netlify/functions/api', router);

// Export handler
exports.handler = serverless(app);
