const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
}

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    // If we have a cached client and it's connected, return it
    if (cachedClient && cachedDb) {
        try {
            // Verify the connection is still alive
            await cachedDb.command({ ping: 1 });
            console.log('Using cached MongoDB connection');
            return cachedClient;
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
            maxPoolSize: 1, // Serverless functions work better with minimal pooling
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

        // Get database instance
        const db = client.db();
        
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

        return client;
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

async function getCollection(dbName, collectionName) {
    const client = await connectToDatabase();
    return client.db(dbName).collection(collectionName);
}

// Database and collection constants
const DB = {
    MASS_MEMS: 'memories',    // For user-uploaded content
    ADMIN: 'memories'      // For announcements and admin content
};

const COLLECTIONS = {
    MEMORIES: 'memories',           // User-uploaded content
    ANNOUNCEMENTS: 'announcements'  // Admin announcements
};

module.exports = { 
    connectToDatabase,
    getCollection,
    DB,
    COLLECTIONS
};
