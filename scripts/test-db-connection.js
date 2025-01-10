require('dotenv').config();
const { connectToDatabase, COLLECTIONS } = require('../netlify/functions/utils/db');

async function testDatabaseConnection() {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');

    try {
        // Test connection
        const { db } = await connectToDatabase();
        console.log('Successfully connected to MongoDB');

        // Test memories collection
        const memoriesCollection = db.collection(COLLECTIONS.MEMORIES);
        const memoriesCount = await memoriesCollection.countDocuments();
        console.log(`Found ${memoriesCount} documents in memories collection`);

        // Test announcements collection
        const announcementsCollection = db.collection(COLLECTIONS.ANNOUNCEMENTS);
        const announcementsCount = await announcementsCollection.countDocuments();
        console.log(`Found ${announcementsCount} documents in announcements collection`);

        // List all collections in the database
        const collections = await db.listCollections().toArray();
        console.log('\nAvailable collections:');
        collections.forEach(collection => {
            console.log(`- ${collection.name}`);
        });

        console.log('\n✅ Database connection test successful');
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        throw error;
    }
}

// Run the test
testDatabaseConnection().catch(console.error);
