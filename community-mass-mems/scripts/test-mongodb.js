const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });
    
    console.log('Connected successfully!');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected successfully!');
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
  process.exit(0);
}

testConnection();
