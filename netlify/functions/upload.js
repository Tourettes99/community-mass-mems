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
const COLLECTION_NAME = 'memories';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const COMPRESSION_QUALITY = 80; // 0-100, higher means better quality
const MAX_IMAGE_DIMENSION = 2048; // Max width/height in pixels
const MAX_VIDEO_DIMENSION = 1280; // 720p
const MAX_AUDIO_BITRATE = '128k'; // 128kbps for audio

// Memory Schema
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: COLLECTION_NAME
});

let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

const getFileType = (contentType) => {
  if (contentType.startsWith('image/gif')) return 'gif';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('application/') || contentType.startsWith('text/')) return 'document';
  return 'url';
};

const compressImage = async (buffer, contentType, originalName) => {
  try {
    let sharpInstance = Sharp(buffer);
    const metadata = await sharpInstance.metadata();
    
    // Calculate new dimensions while maintaining aspect ratio
    let width = metadata.width;
    let height = metadata.height;
    
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      sharpInstance = sharpInstance.resize(width, height);
    }

    // Determine output format and compression options
    let outputFormat;
    let outputOptions = {};

    if (contentType === 'image/gif') {
      outputFormat = 'gif';
      outputOptions = {
        colours: 128
      };
    } else if (contentType === 'image/png' || contentType.includes('png')) {
      outputFormat = 'png';
      outputOptions = {
        compressionLevel: 8,
        palette: true
      };
    } else if (contentType === 'image/webp' || contentType.includes('webp')) {
      outputFormat = 'webp';
      outputOptions = {
        quality: COMPRESSION_QUALITY,
        effort: 6
      };
    } else {
      outputFormat = 'jpeg';
      outputOptions = {
        quality: COMPRESSION_QUALITY,
        mozjpeg: true
      };
    }

    const compressedBuffer = await sharpInstance[outputFormat](outputOptions).toBuffer();

    return {
      buffer: compressedBuffer,
      contentType: `image/${outputFormat}`,
      dimensions: { width, height }
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image: ' + error.message);
  }
};

const compressVideo = (buffer, contentType) => {
  return new Promise((resolve, reject) => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();
    let outputBuffer = Buffer.alloc(0);

    ffmpeg(inputStream)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate(MAX_AUDIO_BITRATE)
      .size(`${MAX_VIDEO_DIMENSION}x?`) // Set width, maintain aspect ratio
      .outputOptions([
        '-preset faster',
        '-crf 23', // Constant Rate Factor (18-28 is good, lower means better quality)
        '-movflags +faststart',
        '-profile:v main',
        '-level 3.1',
        '-pix_fmt yuv420p'
      ])
      .toFormat('mp4')
      .on('error', reject)
      .on('end', () => {
        resolve({
          buffer: outputBuffer,
          contentType: 'video/mp4'
        });
      })
      .pipe(outputStream);

    outputStream.on('data', chunk => {
      outputBuffer = Buffer.concat([outputBuffer, chunk]);
    });

    inputStream.end(buffer);
  });
};

const compressAudio = (buffer, contentType) => {
  return new Promise((resolve, reject) => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();
    let outputBuffer = Buffer.alloc(0);

    ffmpeg(inputStream)
      .audioCodec('libmp3lame')
      .audioBitrate(MAX_AUDIO_BITRATE)
      .toFormat('mp3')
      .on('error', reject)
      .on('end', () => {
        resolve({
          buffer: outputBuffer,
          contentType: 'audio/mpeg'
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
  // For text-based documents, use GZIP compression
  if (contentType.startsWith('text/') || 
      contentType === 'application/json' || 
      contentType === 'application/xml' ||
      contentType === 'application/javascript') {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, { level: 9 }, (error, compressedBuffer) => {
        if (error) reject(error);
        else resolve({
          buffer: compressedBuffer,
          contentType: contentType + ';encoding=gzip'
        });
      });
    });
  }
  
  // For other documents, return as-is
  return {
    buffer,
    contentType
  };
};

const compressFile = async (buffer, contentType, fileName) => {
  const fileType = getFileType(contentType);
  
  switch (fileType) {
    case 'image':
    case 'gif':
      return compressImage(buffer, contentType, fileName);
    case 'video':
      return compressVideo(buffer, contentType);
    case 'audio':
      return compressAudio(buffer, contentType);
    case 'document':
      return compressDocument(buffer, contentType);
    default:
      return { buffer, contentType };
  }
};

const parseMultipartForm = async (event) => {
  try {
    const boundary = event.headers['content-type'].split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in content-type');
    }

    const rawBody = Buffer.from(event.body, 'base64');
    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;

    while (true) {
      const boundaryPos = rawBody.indexOf(boundaryBuffer, start);
      if (boundaryPos === -1) break;
      
      if (start !== 0) {
        parts.push(rawBody.slice(start, boundaryPos));
      }
      start = boundaryPos + boundaryBuffer.length;
    }

    const result = {
      fields: {},
      files: {}
    };

    for (const part of parts) {
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) continue;

      const headers = part.slice(0, headerEnd).toString();
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      const contentTypeMatch = headers.match(/Content-Type: (.+?)(\r\n|\$)/);

      const content = part.slice(headerEnd + 4);

      if (filenameMatch && contentTypeMatch) {
        result.files.file = {
          name: filenameMatch[1],
          type: contentTypeMatch[1].trim(),
          content: content,
          size: content.length
        };
      } else if (nameMatch) {
        result.fields[nameMatch[1]] = content.toString().trim();
      }
    }

    return result;
  } catch (error) {
    console.error('Error parsing multipart form:', error);
    throw error;
  }
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
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: DB_NAME
      });
    }

    let memoryData;
    const contentType = event.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
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

      // Compress the file based on its type
      const { buffer: compressedBuffer, contentType: outputContentType, dimensions } = 
        await compressFile(file.content, file.type, file.name);

      // Convert to base64 and create data URL
      const base64Content = compressedBuffer.toString('base64');
      const dataUrl = `data:${outputContentType};base64,${base64Content}`;

      memoryData = {
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

    } else {
      const body = JSON.parse(event.body);
      const { url, type } = body;

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'URL is required' })
        };
      }

      try {
        new URL(url);
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid URL format' })
        };
      }

      memoryData = {
        type: type || 'url',
        url: url,
        metadata: {
          siteName: new URL(url).hostname,
          ...(body.metadata || {})
        }
      };
    }

    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();

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
    console.error('Error processing upload:', error);
    
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
