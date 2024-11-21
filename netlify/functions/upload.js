const mongoose = require('mongoose');
const { Buffer } = require('buffer');
const formidable = require('formidable-serverless');

const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

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
});

let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

const parseFormData = async (event) => {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    
    form.parse(event, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

const getFileType = (contentType) => {
  if (contentType.startsWith('image/gif')) return 'gif';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'url';
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
        useUnifiedTopology: true
      });
    }

    let memoryData;
    const contentType = event.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const { files } = await parseFormData(event);
      const file = files.file;

      if (!file) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No file uploaded' })
        };
      }

      // For demo, we'll just use the file path as the URL
      // In production, you'd upload this to S3 or another storage service
      memoryData = {
        type: getFileType(file.type),
        url: file.path,
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

    const memory = new Memory(memoryData);
    await memory.save();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(memory)
    };
  } catch (error) {
    console.error('Error processing upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
