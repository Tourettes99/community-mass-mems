const { MongoClient } = require('mongodb');

async function setupMongoDB() {
    const uri = process.env.MONGODB_URI || "mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        // Create mass-mems database and memories collection
        const massMems = client.db('mass-mems');
        await massMems.createCollection('memories');
        console.log('Created mass-mems.memories collection');

        // Create admin-content database and announcements collection
        const adminContent = client.db('admin-content');
        await adminContent.createCollection('announcements');
        console.log('Created admin-content.announcements collection');

        // Create indexes
        await massMems.collection('memories').createIndex({ submittedAt: -1 });
        await massMems.collection('memories').createIndex({ status: 1 });
        await adminContent.collection('announcements').createIndex({ createdAt: -1 });

        console.log('Created indexes');
        console.log('MongoDB setup complete');

    } catch (error) {
        console.error('Error setting up MongoDB:', error);
    } finally {
        await client.close();
    }
}

setupMongoDB().catch(console.error);
