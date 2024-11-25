const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = require('node-fetch');

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
    
    console.log('Submitting memory...');
    const response = await fetch('http://localhost:8888/.netlify/functions/uploadUrl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    const result = await response.json();
    console.log('\nSubmission result:', JSON.stringify(result, null, 2));
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
