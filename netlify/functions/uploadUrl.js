require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0', {
      serverSelectionTimeoutMS: 5000
    });
  }
  return conn;
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Only allow POST
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
    const { url } = JSON.parse(event.body);
    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'No URL provided' })
      };
    }

    await connectDb();
    const memory = new Memory({
      type: 'url',
      url: url,
      metadata: {
        siteName: new URL(url).hostname,
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
    console.error('Error uploading URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Error uploading URL' })
    };
  }
};
