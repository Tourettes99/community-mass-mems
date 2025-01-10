const { getCollection, COLLECTIONS } = require('./utils/db');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    console.log('Getting memories collection...');
    const collection = await getCollection(COLLECTIONS.MEMORIES);

    // Get collection stats
    const stats = await collection.stats();
    
    // Get the most recent 10 documents
    const recentDocs = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Clean up sensitive data from documents
    const cleanDocs = recentDocs.map(doc => {
      const cleanDoc = { ...doc };
      if (cleanDoc.file) {
        cleanDoc.file = '[FILE_DATA_REMOVED]';
      }
      return cleanDoc;
    });


    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Database check completed',
        databaseName: 'memories',
        collectionName: COLLECTIONS.MEMORIES,
        stats: {
          documentCount: stats.count,
          totalSize: stats.size,
          avgDocumentSize: stats.avgObjSize
        },
        recentDocuments: cleanDocs
      }, null, 2)
    };

  } catch (error) {
    console.error('Database check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check database',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
