const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Memory = require('../netlify/functions/models/Memory');

async function listMemories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });
    
    console.log('Connected successfully!\n');
    
    console.log('Fetching memories...');
    const memories = await Memory.find().lean().exec();
    
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
    
    await mongoose.disconnect();
    console.log('\nDisconnected successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

listMemories();
