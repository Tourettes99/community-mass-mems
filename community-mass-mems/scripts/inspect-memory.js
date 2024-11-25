const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function inspectMemory() {
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
    
    console.log('Fetching memory details...');
    const memory = await collection.findOne({ status: 'pending' });
    
    if (memory) {
      console.log('\nFull Memory Object:');
      console.log(JSON.stringify(memory, null, 2));
    } else {
      console.log('\nNo pending memories found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
    console.log('\nDisconnected successfully!');
    process.exit(0);
  }
}

inspectMemory();
