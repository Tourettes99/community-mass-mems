require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
  }
  return conn;
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { memoryId, action, token } = JSON.parse(event.body);

    // Validate required parameters
    if (!memoryId || !action || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }

    // Simple token validation (you might want to make this more secure)
    const expectedToken = Buffer.from(`${memoryId}:${process.env.EMAIL_USER}`).toString('base64');
    if (token !== expectedToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    await connectDb();

    // Find and update the memory
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Memory not found' })
      };
    }

    // Update status based on action
    memory.status = action === 'approve' ? 'approved' : 'rejected';
    await memory.save();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Memory ${action}d successfully`,
        status: memory.status
      })
    };

  } catch (error) {
    console.error('Error in moderation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
