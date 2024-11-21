import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS || 'https://your-netlify-app.netlify.app'
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Serve uploads directory
app.use('/uploads', express.static(uploadsDir));

// Serve static files from the React app
const clientBuildPath = path.join(__dirname, 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// API Routes prefix
const apiRouter = express.Router();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/memories', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image', 'gif', 'audio', 'url'],
    required: true
  },
  content: String,
  fileName: String,
  fileFormat: String,
  dimensions: String,
  duration: String,
  fps: Number,
  urlMetadata: {
    title: String,
    description: String,
    image: String,
    siteName: String,
    favicon: String,
    url: String
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Memory = mongoose.model('Memory', memorySchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
      cb(new Error('Invalid file type. Only images, GIFs, and audio files are allowed.'));
    }
  }
});

// URL metadata extraction
async function getUrlMetadata(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    return {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || url,
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      siteName: $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname,
      favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico',
      url: url
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return {
      title: url,
      description: '',
      image: '',
      siteName: new URL(url).hostname,
      favicon: '',
      url: url
    };
  }
}

// Routes
apiRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { type } = req.body;
    let memoryData = { type };

    switch (type) {
      case 'text':
        memoryData.content = req.body.content;
        break;

      case 'image':
      case 'gif':
      case 'audio':
        if (!req.file) {
          throw new Error('No file uploaded');
        }
        memoryData = {
          ...memoryData,
          content: req.file.filename,
          fileName: req.body.fileName,
          fileFormat: req.body.fileFormat,
          dimensions: req.body.dimensions,
          duration: req.body.duration,
          fps: type === 'gif' ? parseFloat(req.body.fps) : undefined
        };
        break;

      case 'url':
        const url = req.body.content;
        try {
          new URL(url); // Validate URL
          const metadata = await getUrlMetadata(url);
          memoryData.content = url;
          memoryData.urlMetadata = metadata;
        } catch {
          throw new Error('Invalid URL');
        }
        break;

      default:
        throw new Error('Invalid memory type');
    }

    const memory = new Memory(memoryData);
    await memory.save();
    res.json(memory);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

apiRouter.get('/memories', async (req, res) => {
  try {
    const memories = await Memory.find().sort({ createdAt: -1 });
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Error fetching memories' });
  }
});

// Use API router with /api prefix
app.use('/api', apiRouter);

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
