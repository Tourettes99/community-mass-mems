const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/?authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = "memories";

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    try {
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const db = client.db(DATABASE_NAME);
        cachedDb = db;
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

module.exports = { connectToDatabase };
