const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    try {
        // Connect with increased timeouts
        cachedClient = await MongoClient.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 75000,
            connectTimeoutMS: 30000,
            family: 4
        });

        console.log('Successfully connected to MongoDB');
        return cachedClient;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        cachedClient = null;
        throw error;
    }
}

async function getCollection(dbName, collectionName) {
    const client = await connectToDatabase();
    return client.db(dbName).collection(collectionName);
}

// Database and collection constants
const DB = {
    MASS_MEMS: 'mass-mems',    // For user-uploaded content
    ADMIN: 'admin-content'      // For announcements and admin content
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
