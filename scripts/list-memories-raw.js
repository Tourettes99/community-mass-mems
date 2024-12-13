const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function listMemories() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    family: 4
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!\n');
    
    const db = client.db('memories');
    const collection = db.collection('memories');
    
    console.log('Fetching memories...');
    const memories = await collection.find({}).toArray();
    
    console.log(`\nFound ${memories.length} total memories:`);
    memories.forEach((memory, index) => {
      console.log(`\n[Memory ${index + 1}]`);
      console.log(`ID: ${memory._id}`);
      console.log(`Status: ${memory.status}`);
      console.log(`Created: ${memory.createdAt}`);
      console.log(`URL: ${memory.url}`);
      if (memory.metadata?.title) {
        console.log(`Title: ${memory.metadata.title}`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
    console.log('\nDisconnected successfully!');
    process.exit(0);
  }
}

listMemories();
