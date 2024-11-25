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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
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
    let memoryId, action, token;

    // Check if the request is form-urlencoded or JSON
    const contentType = event.headers['content-type'] || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const params = new URLSearchParams(event.body);
      memoryId = params.get('memoryId');
      action = params.get('action');
      token = params.get('token');
    } else {
      // Parse JSON data
      const body = JSON.parse(event.body);
      memoryId = body.memoryId;
      action = body.action;
      token = body.token;
    }

    // Validate required parameters
    if (!memoryId || !action || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          received: { memoryId, action, token }
        })
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

    // Simple token validation
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

    // Send HTML response for form submissions
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*'
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Moderation Result</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      background-color: #f0f2f5;
                  }
                  .container {
                      text-align: center;
                      padding: 20px;
                      background-color: white;
                      border-radius: 8px;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                      max-width: 500px;
                      width: 90%;
                  }
                  .message {
                      margin: 20px 0;
                      font-size: 18px;
                      color: ${action === 'approve' ? '#4CAF50' : '#f44336'};
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="message">
                      Memory successfully ${action}ed!
                  </div>
              </div>
          </body>
          </html>
        `
      };
    }

    // Send JSON response for API calls
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Memory ${action}ed successfully`,
        status: memory.status
      })
    };

  } catch (error) {
    console.error('Error in moderation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
