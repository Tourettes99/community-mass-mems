require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');
const path = require('path');
const busboy = require('busboy');

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0', {
      serverSelectionTimeoutMS: 5000
    });
  }
  return conn;
};

const processFormData = async (event) => {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: event.headers });
    const result = {
      files: [],
      fields: {}
    };

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];

      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        result.files.push({
          filename,
          content: Buffer.concat(chunks),
          mimeType
        });
      });
    });

    bb.on('field', (name, val) => {
      result.fields[name] = val;
    });

    bb.on('finish', () => resolve(result));
    bb.on('error', (error) => reject(error));

    bb.write(Buffer.from(event.body, 'base64'));
    bb.end();
  });
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Access-Control-Allow-Origin': '*'
      },
      body: 'Method Not Allowed'
    };
  }

  try {
    const formData = await processFormData(event);
    
    if (!formData.files || formData.files.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'No file uploaded' })
      };
    }

    const file = formData.files[0];
    const fileExtension = path.extname(file.filename);
    
    // Save file directly in response
    const fileUrl = `data:${file.mimeType};base64,${file.content.toString('base64')}`;

    // Save to MongoDB
    await connectDb();
    const fileType = file.mimeType.startsWith('image/') ? 
      (file.mimeType.includes('gif') ? 'gif' : 'image') : 
      (file.mimeType.startsWith('audio/') ? 'audio' : 'url');

    const memory = new Memory({
      type: fileType,
      url: fileUrl,
      metadata: {
        fileName: file.filename,
        format: fileExtension.substring(1)
      }
    });

    await memory.save();
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(memory)
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Error uploading file' })
    };
  }
};
