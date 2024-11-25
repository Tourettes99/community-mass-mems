const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getUrlMetadata } = require('./get-metadata');

async function submitMemory(url) {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    family: 4
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!\n');
    
    console.log('Fetching metadata for URL:', url);
    const metadata = await getUrlMetadata(url);
    console.log('\nMetadata:', JSON.stringify(metadata, null, 2));
    
    const db = client.db('memories');
    const collection = db.collection('memories');
    
    const memory = {
      type: metadata.type || 'url',
      url: url,
      tags: [],
      status: 'pending',
      metadata: metadata,
      votes: { up: 0, down: 0 },
      userVotes: {},
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('\nSubmitting memory to database...');
    const result = await collection.insertOne(memory);
    console.log('Memory submitted successfully! ID:', result.insertedId);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
    console.log('\nDisconnected successfully!');
    process.exit(0);
  }
}

// Get URL from command line argument
const url = process.argv[2];
if (!url) {
  console.error('Please provide a URL as an argument');
  process.exit(1);
}

submitMemory(url);
