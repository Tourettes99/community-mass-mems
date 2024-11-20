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
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type']
}));

app.use(express.json());

// Serve the introduction audio file
app.get('/audio/introduction', (req, res) => {
  const audioPath = path.join(__dirname, 'episode 1. introduktion.mp3');
  console.log('Attempting to serve audio from:', audioPath);
  
  // Check if file exists
  if (!fs.existsSync(audioPath)) {
    console.error('Audio file not found at:', audioPath);
    return res.status(404).send('Audio file not found');
  }

  // Set appropriate headers
  res.set({
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
  });

  // Stream the file
  const stat = fs.statSync(audioPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(audioPath, {start, end});
    
    res.status(206);
    res.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.set('Content-Length', chunksize);
    file.pipe(res);
  } else {
    res.set('Content-Length', fileSize);
    fs.createReadStream(audioPath).pipe(res);
  }
});

// Serve static files with CORS headers
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', (req, res, next) => {
  console.log('Received request for:', req.path);
  
  if (req.path.match(/\.(mp3|wav|ogg)$/i)) {
    console.log('Audio file requested:', req.path);
  }

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
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
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

    // Special handling for Patreon URLs
    const isPatreon = url.includes('patreon.com');
    
    return {
      title: isPatreon ? 'Support R1 Memories on Patreon' : $('meta[property="og:title"]').attr('content') || $('title').text(),
      description: isPatreon ? 'Join our community and support R1 Memories' : $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
      image: isPatreon ? 'https://c5.patreon.com/external/logo/downloads_wordmark_white_on_coral.png' : $('meta[property="og:image"]').attr('content'),
      url: url,
      siteName: isPatreon ? 'Patreon' : $('meta[property="og:site_name"]').attr('content'),
      type: isPatreon ? 'patreon' : $('meta[property="og:type"]').attr('content')
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return null;
  }
}

// Add route to get URL metadata
app.get('/api/url-metadata', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const metadata = await getUrlMetadata(url);
    if (!metadata) {
      return res.status(404).json({ error: 'Could not fetch metadata' });
    }
    res.json(metadata);
  } catch (error) {
    console.error('Error in /api/url-metadata:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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
