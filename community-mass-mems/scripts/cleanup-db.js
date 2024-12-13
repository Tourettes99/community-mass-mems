const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'memories';
const COLLECTION_NAME = 'memories';

async function cleanupDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI);

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get all documents
    const docs = await collection.find({}).toArray();
    console.log(`Found ${docs.length} documents to process`);

    let updateCount = 0;
    for (const doc of docs) {
      const updates = {};

      // Remove unnecessary fields
      if ('updatedAt' in doc) updates.$unset = { ...updates.$unset, updatedAt: "" };
      if ('__v' in doc) updates.$unset = { ...updates.$unset, __v: "" };
      if (doc.content === "") updates.$unset = { ...updates.$unset, content: "" };

      // Fix metadata for URLs
      if (doc.type === 'url' && doc.url) {
        try {
          const url = new URL(doc.url);
          updates.$set = {
            ...updates.$set,
            'metadata.title': doc.metadata.title === doc.url ? url.hostname : doc.metadata.title,
            'metadata.description': doc.metadata.description === doc.url ? 'No description available' : doc.metadata.description,
            'metadata.siteName': url.hostname,
            'metadata.favicon': `https://www.google.com/s2/favicons?domain=${doc.url}`
          };
        } catch (error) {
          console.error(`Error processing URL for document ${doc._id}:`, error);
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        try {
          await collection.updateOne({ _id: doc._id }, updates);
          updateCount++;
          console.log(`Updated document ${doc._id}`);
        } catch (error) {
          console.error(`Error updating document ${doc._id}:`, error);
        }
      }
    }

    console.log(`\nCleanup completed:`);
    console.log(`- Total documents processed: ${docs.length}`);
    console.log(`- Documents updated: ${updateCount}`);

    await client.close();
    console.log('\nDatabase connection closed.');

  } catch (error) {
    console.error('Database cleanup error:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the cleanup
cleanupDatabase();
