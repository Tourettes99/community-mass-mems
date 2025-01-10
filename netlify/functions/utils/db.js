const { MongoClient } = require('mongodb');

// Use the provided MongoDB connection string
const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    // If we have a cached client and it's connected, return it
    if (cachedClient && cachedDb) {
        try {
            // Verify the connection is still alive
            await cachedDb.command({ ping: 1 });
            console.log('Using cached MongoDB connection');
            return { client: cachedClient, db: cachedDb };
        } catch (e) {
            console.log('Cached connection is stale, creating new connection');
            // Connection is stale, fall through to create a new one
            cachedClient = null;
            cachedDb = null;
        }
    }

    try {
        console.log('Creating new MongoDB connection');
        
        // Connection options optimized for serverless environment
        const options = {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            retryReads: true,
            w: 'majority'
        };

        // Create new client
        const client = new MongoClient(MONGODB_URI, options);
        await client.connect();

        // Get database instance (memories is the database name from the connection string)
        const db = client.db('memories');
        
        // Test the connection
        await db.command({ ping: 1 });
        console.log('Successfully connected to MongoDB');

        // Cache the client and db instances
        cachedClient = client;
        cachedDb = db;

        // Add connection error handler
        client.on('error', (error) => {
            console.error('MongoDB connection error:', error);
            cachedClient = null;
            cachedDb = null;
        });

        return { client, db };
    } catch (error) {
        console.error('MongoDB connection error:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        cachedClient = null;
        cachedDb = null;
        throw error;
    }
}

async function getCollection(collectionName) {
    const { db } = await connectToDatabase();
    return db.collection(collectionName);
}

// Collection constants based on actual MongoDB structure
const COLLECTIONS = {
    MEMORIES: 'memories',           // Main collection for memories
    ANNOUNCEMENTS: 'announcements'  // Collection for announcements
};

module.exports = { 
    connectToDatabase,
    getCollection,
    COLLECTIONS
};
