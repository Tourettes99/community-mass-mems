const mongoose = require('mongoose');
const { Buffer } = require('buffer');
const Sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const zlib = require('zlib');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const DB_NAME = 'memories';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const COMPRESSION_QUALITY = 80; // 0-100, higher means better quality
const MAX_IMAGE_DIMENSION = 2048; // Max width/height in pixels
const MAX_VIDEO_DIMENSION = 1280; // 720p
const MAX_AUDIO_BITRATE = '128k'; // 128kbps for audio

// Memory Schema (same as in upload.js)
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'video', 'audio', 'document', 'url'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    bitrate: String,
    codec: String,
    siteName: String,
    description: String,
    size: {
      original: Number,
      compressed: Number
    },
    contentType: String,
    dimensions: {
      width: Number,
      height: Number
    }
  }
}, { timestamps: true });

// Create the Memory model
const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

// File processing functions
const getFileType = (contentType) => {
  if (contentType.startsWith('image/gif')) return 'gif';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'document';
};

const compressImage = async (buffer, contentType, originalName) => {
  const image = Sharp(buffer);
  const metadata = await image.metadata();
  
  let resizeOptions = {};
  if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
    resizeOptions = {
      width: Math.min(metadata.width, MAX_IMAGE_DIMENSION),
      height: Math.min(metadata.height, MAX_IMAGE_DIMENSION),
      fit: 'inside',
      withoutEnlargement: true
    };
  }

  let processedImage;
  if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
    processedImage = await image
      .resize(resizeOptions)
      .jpeg({ quality: COMPRESSION_QUALITY })
      .toBuffer();
  } else if (contentType === 'image/png') {
    processedImage = await image
      .resize(resizeOptions)
      .png({ compressionLevel: 9 })
      .toBuffer();
  } else if (contentType === 'image/gif') {
    processedImage = buffer; // Don't compress GIFs to preserve animation
  } else {
    processedImage = await image
      .resize(resizeOptions)
      .toBuffer();
  }

  const dimensions = {
    width: metadata.width,
    height: metadata.height
  };

  return {
    buffer: processedImage,
    contentType,
    dimensions
  };
};

const compressVideo = async (buffer, contentType) => {
  return new Promise((resolve, reject) => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();
    let outputBuffer = Buffer.alloc(0);

    ffmpeg(inputStream)
      .size(`${MAX_VIDEO_DIMENSION}x?`)
      .videoBitrate('1000k')
      .audioBitrate('128k')
      .format('mp4')
      .on('error', reject)
      .on('end', () => {
        resolve({
          buffer: outputBuffer,
          contentType: 'video/mp4',
          dimensions: {
            width: MAX_VIDEO_DIMENSION,
            height: null // Maintained aspect ratio
          }
        });
      })
      .pipe(outputStream);

    outputStream.on('data', chunk => {
      outputBuffer = Buffer.concat([outputBuffer, chunk]);
    });

    inputStream.end(buffer);
  });
};

const compressAudio = async (buffer, contentType) => {
  return new Promise((resolve, reject) => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();
    let outputBuffer = Buffer.alloc(0);

    ffmpeg(inputStream)
      .audioBitrate(MAX_AUDIO_BITRATE)
      .format('mp3')
      .on('error', reject)
      .on('end', () => {
        resolve({
          buffer: outputBuffer,
          contentType: 'audio/mp3'
        });
      })
      .pipe(outputStream);

    outputStream.on('data', chunk => {
      outputBuffer = Buffer.concat([outputBuffer, chunk]);
    });

    inputStream.end(buffer);
  });
};

const compressDocument = async (buffer, contentType) => {
  return new Promise((resolve, reject) => {
    zlib.gzip(buffer, (error, compressedBuffer) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          buffer: compressedBuffer,
          contentType
        });
      }
    });
  });
};

const compressFile = async (buffer, contentType, fileName) => {
  const type = getFileType(contentType);
  
  switch (type) {
    case 'image':
    case 'gif':
      return compressImage(buffer, contentType, fileName);
    case 'video':
      return compressVideo(buffer, contentType);
    case 'audio':
      return compressAudio(buffer, contentType);
    default:
      return compressDocument(buffer, contentType);
  }
};

const parseMultipartForm = async (event) => {
  // Implementation of multipart form parsing
  // This is a placeholder - you'll need to implement this based on your needs
  throw new Error('Multipart form parsing not implemented');
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!mongoose.connection.readyState) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: DB_NAME
      });
      console.log('Connected to MongoDB successfully');
    }

    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' })
      };
    }

    const formData = await parseMultipartForm(event);
    if (!formData.files.file) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file uploaded' })
      };
    }

    const file = formData.files.file;
    if (file.size > MAX_FILE_SIZE) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: 'File too large. Maximum size is 10MB.' })
      };
    }

    console.log('Processing file:', file.name);
    const { buffer: compressedBuffer, contentType: outputContentType, dimensions } = 
      await compressFile(file.content, file.type, file.name);

    const base64Content = compressedBuffer.toString('base64');
    const dataUrl = `data:${outputContentType};base64,${base64Content}`;

    const memoryData = {
      type: getFileType(outputContentType),
      url: dataUrl,
      metadata: {
        fileName: file.name,
        format: outputContentType.split('/')[1],
        size: {
          original: file.size,
          compressed: compressedBuffer.length
        },
        contentType: outputContentType,
        dimensions
      }
    };

    console.log('Compression results:', {
      originalSize: Math.round(file.size / 1024) + 'KB',
      compressedSize: Math.round(compressedBuffer.length / 1024) + 'KB',
      compressionRatio: Math.round((1 - compressedBuffer.length / file.size) * 100) + '%',
      type: getFileType(outputContentType)
    });

    console.log('Creating new memory:', JSON.stringify(memoryData, null, 2));
    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    console.log('Memory saved successfully:', savedMemory._id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Upload successful',
        memory: {
          _id: savedMemory._id,
          type: savedMemory.type,
          url: savedMemory.url,
          metadata: savedMemory.metadata,
          createdAt: savedMemory.createdAt
        }
      })
    };
  } catch (error) {
    console.error('Error processing file upload:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
