const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/?authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = "memories";
const COLLECTION_NAME = "memories";

let cachedDb = null;
let cachedCollection = null;

async function connectToDatabase() {
    if (cachedCollection) {
        return cachedCollection;
    }

    try {
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        cachedDb = db;
        cachedCollection = collection;
        
        return collection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

module.exports = { connectToDatabase };
