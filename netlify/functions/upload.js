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
  try {
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const rawBody = Buffer.from(event.body, 'base64');
    
    // Split the body into parts using the boundary
    const parts = rawBody.toString().split(`--${boundary}`);
    const result = {
      fields: {},
      files: {}
    };

    for (const part of parts) {
      if (!part.includes('Content-Disposition: form-data;')) continue;

      // Split headers and content
      const [headerSection, ...contentSections] = part.split('\r\n\r\n');
      if (!headerSection || contentSections.length === 0) continue;

      // Get content without the trailing boundary and \r\n
      let content = contentSections.join('\r\n\r\n');
      if (content.endsWith('\r\n')) {
        content = content.slice(0, -2);
      }

      // Parse headers
      const nameMatch = headerSection.match(/name="([^"]+)"/);
      const filenameMatch = headerSection.match(/filename="([^"]+)"/);
      const contentTypeMatch = headerSection.match(/Content-Type: (.+)/);

      if (filenameMatch && contentTypeMatch) {
        // This is a file
        const startPos = part.indexOf('\r\n\r\n') + 4;
        const fileContent = rawBody.slice(
          rawBody.indexOf(Buffer.from(part.slice(startPos))),
          rawBody.indexOf(Buffer.from(`--${boundary}`, startPos))
        );

        result.files.file = {
          name: filenameMatch[1],
          type: contentTypeMatch[1].trim(),
          content: fileContent
        };
      } else if (nameMatch) {
        // This is a regular field
        result.fields[nameMatch[1]] = content.trim();
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
      console.log('Parsed form data:', { 
        fields: formData.fields,
        fileInfo: formData.files.file ? {
          name: formData.files.file.name,
          type: formData.files.file.type,
          size: formData.files.file.content.length
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
      
      // Convert binary content to base64 and create proper data URL
      const base64Content = file.content.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64Content}`;

      memoryData = {
        type: getFileType(file.type),
        url: dataUrl,
        metadata: {
          fileName: file.name,
          format: file.type.split('/')[1],
          size: file.content.length,
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

    console.log('Memory data to save:', {
      ...memoryData,
      url: memoryData.url.substring(0, 50) + '...' // Truncate URL for logging
    });

    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();

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
