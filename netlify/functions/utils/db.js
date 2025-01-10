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

module.exports = { 
    connectToDatabase,
    getCollection,
    DB_NAME: 'mass-mems'  // Centralize database name
};
