const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB!');
    
    // Try to perform a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testConnection();
