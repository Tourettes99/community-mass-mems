const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
}

// These should match the database and collection names in the connection string
const DATABASE_NAME = "memories";
const COLLECTION_NAME = "memories";

let cachedDb = null;
let cachedCollection = null;

async function connectToDatabase() {
    if (cachedCollection) {
        return cachedCollection;
    }

    try {
        // Using the connection string that explicitly points to memories.memories
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000
        });

        // These should match what's in the connection string
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        console.log('Successfully connected to memories.memories collection');
        
        cachedDb = db;
        cachedCollection = collection;
        
        return collection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

module.exports = { connectToDatabase };
