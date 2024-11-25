const mongoose = require('mongoose');

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        cachedDb = connection;
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

module.exports = { connectToDatabase };
