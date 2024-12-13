const { MongoClient } = require('mongodb');
const { getUrlMetadata } = require('./utils/urlMetadata');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let client;

  try {
    // Connect to MongoDB
    client = await MongoClient.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });

    const db = client.db('mass-mems');
    const collection = db.collection('announcements');

    // Get announcements, sorted by date
    const announcements = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Process announcements to ensure metadata is complete
    const processedAnnouncements = await Promise.all(announcements.map(async (announcement) => {
      // If it's a URL type and metadata is incomplete, try to fetch it again
      if (announcement.type === 'url' && (!announcement.metadata?.basicInfo?.title || !announcement.metadata?.embed?.embedHtml)) {
        try {
          console.log('Refetching metadata for URL:', announcement.url);
          const freshMetadata = await getUrlMetadata(announcement.url);
          
          // Update announcement with fresh metadata
          await collection.updateOne(
            { _id: announcement._id },
            { 
              $set: { 
                metadata: freshMetadata,
                updatedAt: new Date()
              }
            }
          );

          return {
            ...announcement,
            metadata: freshMetadata
          };
        } catch (error) {
          console.error('Error refetching metadata:', error);
          return announcement;
        }
      }
      return announcement;
    }));

    // Add CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processedAnnouncements)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Error fetching announcements',
        details: error.message 
      })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
