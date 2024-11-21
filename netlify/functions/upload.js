const mongoose = require('mongoose');
const { Buffer } = require('buffer');

const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
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
    description: String
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

const parseMultipartForm = event => {
  const boundary = event.headers['content-type'].split('=')[1];
  const body = Buffer.from(event.body, 'base64').toString();
  
  const parts = body.split(`--${boundary}`);
  const result = {
    fields: {},
    files: {}
  };

  parts.forEach(part => {
    if (part.includes('Content-Disposition: form-data;')) {
      const [headers, ...contentParts] = part.split('\r\n\r\n');
      const content = contentParts.join('\r\n\r\n').trim();
      
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      
      if (filenameMatch) {
        const contentTypeMatch = headers.match(/Content-Type: (.+)/);
        result.files.file = {
          name: filenameMatch[1],
          type: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
          content: content
        };
      } else if (nameMatch) {
        result.fields[nameMatch[1]] = content;
      }
    }
  });

  return result;
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    console.log('Content-Type:', event.headers['content-type']);

    let memoryData;
    const contentType = event.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = parseMultipartForm(event);
      console.log('Parsed form data:', formData);

      if (!formData.files.file) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No file uploaded' })
        };
      }

      const file = formData.files.file;
      
      // For now, we'll store the file content as a data URL
      // In production, you'd want to upload this to S3 or another storage service
      const base64Content = Buffer.from(file.content).toString('base64');
      const dataUrl = `data:${file.type};base64,${base64Content}`;

      memoryData = {
        type: getFileType(file.type),
        url: dataUrl,
        metadata: {
          fileName: file.name,
          format: file.type.split('/')[1],
          // Add more metadata as needed
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

    console.log('Memory data to save:', memoryData);
    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    console.log('Saved memory:', savedMemory);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(savedMemory)
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
