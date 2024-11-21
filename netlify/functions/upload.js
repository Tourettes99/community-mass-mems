const mongoose = require('mongoose');
const { Buffer } = require('buffer');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'memories';
const COLLECTION_NAME = 'memories';

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'audio', 'url'],
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
    siteName: String,
    description: String,
    size: Number,
    contentType: String
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
  if (contentType.startsWith('audio/')) return 'audio';
  return 'url';
};

const parseMultipartForm = async (event) => {
  try {
    // Extract boundary from content type
    const boundary = event.headers['content-type'].split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in content-type');
    }

    // Convert base64 body to buffer
    const rawBody = Buffer.from(event.body, 'base64');
    
    // Split body into parts using boundary
    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;

    // Find all boundary positions
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

    // Process each part
    for (const part of parts) {
      // Find the end of headers (double CRLF)
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) continue;

      // Parse headers
      const headers = part.slice(0, headerEnd).toString();
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      const contentTypeMatch = headers.match(/Content-Type: (.+?)(\r\n|\$)/);

      // Get content (skip the double CRLF)
      const content = part.slice(headerEnd + 4);

      if (filenameMatch && contentTypeMatch) {
        // This is a file
        result.files.file = {
          name: filenameMatch[1],
          type: contentTypeMatch[1].trim(),
          content: content,
          size: content.length
        };
      } else if (nameMatch) {
        // This is a field
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
    return {
      statusCode: 204,
      headers,
      body: ''
    };
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

    console.log('MongoDB Connection State:', mongoose.connection.readyState);
    console.log('Database Name:', mongoose.connection.db.databaseName);

    let memoryData;
    const contentType = event.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await parseMultipartForm(event);
      console.log('Parsed form data:', {
        fields: formData.fields,
        fileInfo: formData.files.file ? {
          name: formData.files.file.name,
          type: formData.files.file.type,
          size: formData.files.file.size
        } : null
      });

      if (!formData.files.file) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No file uploaded' })
        };
      }

      const file = formData.files.file;

      // Validate file size (e.g., 10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({ error: 'File too large. Maximum size is 10MB.' })
        };
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return {
          statusCode: 415,
          headers,
          body: JSON.stringify({ error: 'Unsupported file type. Allowed types: JPEG, PNG, GIF, WebP' })
        };
      }

      // Convert to base64 and create data URL
      const base64Content = file.content.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64Content}`;

      // Get image dimensions if possible
      let dimensions = '';
      try {
        // You might want to add image-size or similar package to get dimensions
        // For now, we'll skip this
      } catch (error) {
        console.warn('Could not get image dimensions:', error);
      }

      memoryData = {
        type: getFileType(file.type),
        url: dataUrl,
        metadata: {
          fileName: file.name,
          format: file.type.split('/')[1],
          size: file.size,
          contentType: file.type,
          resolution: dimensions
        }
      };
    } else {
      // Handle URL upload
      const body = JSON.parse(event.body);
      const { url, type } = body;

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'URL is required' })
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

    console.log('Saving memory data:', {
      ...memoryData,
      url: memoryData.url.substring(0, 50) + '...' // Truncate URL for logging
    });

    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();

    console.log('Memory saved successfully');

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        ...savedMemory.toObject(),
        url: memoryData.url // Include the full URL in the response
      })
    };
  } catch (error) {
    console.error('Error processing upload:', error);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
