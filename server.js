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
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  credentials: true
}));

app.use(express.json());

// Serve static files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For audio files, set additional headers
  if (req.path.match(/\.(mp3|wav|ogg)$/i)) {
    res.header('Accept-Ranges', 'bytes');
    res.header('Content-Type', 'audio/mpeg');
  }

  next();
}, express.static(uploadsDir, {
  setHeaders: (res, path) => {
    if (path.match(/\.(mp3|wav|ogg)$/i)) {
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Type': 'audio/mpeg'
      });
    }
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/r1memories', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB successfully');
  console.log('Database URL:', process.env.MONGODB_URI ? 'Using environment variable' : 'Using localhost');
}).catch(err => {
  console.error('MongoDB connection error details:', {
    message: err.message,
    code: err.code,
    name: err.name
  });
  console.error('Full error:', err);
});

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: String, // 'image', 'gif', 'audio', 'text', 'link'
  content: String,
  fileName: String,
  fileFormat: String,
  dimensions: String,
  duration: String,
  urlMetadata: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    siteName: { type: String, default: '' },
    type: { type: String, default: 'website' },
    favicon: { type: String, default: '' },
    url: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now }
});

const Memory = mongoose.model('Memory', memorySchema);

// Check if file exists and clean up database if not
const cleanupMissingFiles = async (memories) => {
  const deletedMemories = [];
  
  for (const memory of memories) {
    if (memory.type === 'text' || memory.type === 'link') continue;
    
    const filePath = path.join(uploadsDir, memory.content);
    if (!fs.existsSync(filePath)) {
      await Memory.deleteOne({ _id: memory._id });
      deletedMemories.push(memory._id);
      console.log(`Deleted memory ${memory._id} because file ${memory.content} not found`);
    }
  }
  
  return deletedMemories;
};

// URL metadata extraction
async function getUrlMetadata(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Get OpenGraph data
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    const ogType = $('meta[property="og:type"]').attr('content');

    // Get Twitter Card data as fallback
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterDescription = $('meta[name="twitter:description"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    const twitterCard = $('meta[name="twitter:card"]').attr('content');

    // Get standard meta tags as final fallback
    const metaDescription = $('meta[name="description"]').attr('content');
    const title = $('title').text();
    
    // Get the favicon
    let favicon = $('link[rel="icon"]').attr('href') || 
                 $('link[rel="shortcut icon"]').attr('href') ||
                 '/favicon.ico';

    // Ensure favicon has absolute URL
    try {
      favicon = new URL(favicon, url).href;
    } catch (e) {
      console.warn('Failed to parse favicon URL:', e);
      favicon = '';
    }

    // Combine all data with fallbacks
    const metadata = {
      title: ogTitle || twitterTitle || title || '',
      description: ogDescription || twitterDescription || metaDescription || '',
      image: ogImage || twitterImage || '',
      siteName: ogSiteName || new URL(url).hostname || '',
      type: ogType || twitterCard || 'website',
      favicon: favicon,
      url: url
    };

    console.log('Extracted metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    const fallbackMetadata = {
      title: url,
      description: '',
      image: '',
      siteName: new URL(url).hostname,
      type: 'website',
      favicon: '',
      url: url
    };
    console.log('Using fallback metadata:', fallbackMetadata);
    return fallbackMetadata;
  }
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 } // 10MB limit
});

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', req.body);
    
    if (req.file) {
      console.log('File upload detected:', req.file);
      // Handle file uploads
      const { type } = req.body;
      const memory = new Memory({
        type,
        content: req.file.filename,
        fileName: req.file.originalname,
        fileFormat: path.extname(req.file.originalname),
        dimensions: req.body.dimensions,
        duration: req.body.duration
      });
      await memory.save();
      res.json(memory);
    } else if (req.body.type === 'link') {
      console.log('URL upload detected:', req.body.content);
      try {
        // Validate URL
        new URL(req.body.content);
        
        // Handle URL uploads
        const metadata = await getUrlMetadata(req.body.content);
        console.log('Creating memory with metadata:', metadata);
        
        const memory = new Memory({
          type: 'link',
          content: req.body.content,
          urlMetadata: metadata
        });
        
        const savedMemory = await memory.save();
        console.log('Saved memory:', savedMemory);
        res.json(savedMemory);
      } catch (urlError) {
        console.error('Invalid URL:', urlError);
        res.status(400).json({ error: 'Invalid URL format' });
      }
    } else if (req.body.type === 'text') {
      console.log('Text upload detected:', req.body.content);
      // Handle text uploads
      const memory = new Memory({
        type: 'text',
        content: req.body.content
      });
      await memory.save();
      res.json(memory);
    } else {
      console.error('Invalid upload type:', req.body);
      res.status(400).json({ error: 'Invalid upload type or missing content' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memories', async (req, res) => {
  try {
    const memories = await Memory.find().sort({ createdAt: -1 });
    const deletedMemories = await cleanupMissingFiles(memories);
    
    // Filter out deleted memories
    const validMemories = memories.filter(memory => 
      !deletedMemories.includes(memory._id)
    );
    
    res.json(validMemories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Error fetching memories' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
