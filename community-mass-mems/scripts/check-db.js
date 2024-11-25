const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'memories';
const COLLECTION_NAME = 'memories';

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI);

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get document count
    const count = await collection.countDocuments();
    
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

    console.log('\nDatabase Check Results:');
    console.log('======================');
    console.log(`Database: ${DB_NAME}`);
    console.log(`Collection: ${COLLECTION_NAME}`);
    console.log('\nCollection Stats:');
    console.log('-----------------');
    console.log(`Document Count: ${count}`);
    
    if (count > 0) {
      console.log('\nMost Recent Documents:');
      console.log('---------------------');
      console.log(JSON.stringify(cleanDocs, null, 2));
    } else {
      console.log('\nNo documents found in the collection.');
    }

    await client.close();
    console.log('\nDatabase connection closed.');

  } catch (error) {
    console.error('Database check error:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the check
checkDatabase();
