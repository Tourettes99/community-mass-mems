const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
        console.log('Using cached MongoDB connection');
        return cachedClient;
    }

    try {
        console.log('Attempting to connect to MongoDB...');
        console.log('Connection string:', process.env.MONGODB_URI ? 'Present' : 'Missing');
        
        // Connect with increased timeouts and new options
        const client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 75000,
            connectTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 5,
            retryWrites: true,
            retryReads: true,
            family: 4
        });

        await client.connect();
        
        // Test the connection
        await client.db('admin').command({ ping: 1 });
        console.log('Successfully connected to MongoDB and verified connection');
        
        cachedClient = client;
        return client;
    } catch (error) {
        console.error('Detailed MongoDB connection error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            codeName: error.codeName
        });
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
