const fileStorage = require('./services/fileStorage');
const { ObjectId } = require('mongodb');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const fileId = event.queryStringParameters?.id;
    if (!fileId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File ID is required' })
      };
    }

    // Get the file stream
    const stream = await fileStorage.getFile(new ObjectId(fileId));
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return the file with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error serving media:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
