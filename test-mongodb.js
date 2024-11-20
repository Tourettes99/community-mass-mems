import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Initialize dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;
console.log('Attempting to connect with URI:', uri);

try {
  await mongoose.connect(uri);
  console.log('Successfully connected to MongoDB!');
  
  // Try to perform a simple operation
  const result = await mongoose.connection.db.admin().listDatabases();
  console.log('Available databases:', result.databases.map(db => db.name));
  
  await mongoose.connection.close();
  console.log('Connection closed successfully');
  process.exit(0);
} catch (err) {
  console.error('Connection error:', err.message);
  if (err.message.includes('Authentication failed')) {
    console.log('\nPossible solutions:');
    console.log('1. Verify username and password are correct');
    console.log('2. Check if the user has the correct permissions');
    console.log('3. Ensure the user is associated with the correct authentication database');
    console.log('4. Verify the connection string format');
    console.log('\nCurrent connection string format should be:');
    console.log('mongodb+srv://username:password@cluster0.rz2oj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  }
  process.exit(1);
}
