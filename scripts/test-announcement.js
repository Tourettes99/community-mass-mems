const { MongoClient } = require('mongodb');

async function testAnnouncement() {
    const uri = "mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('admin-content');
        const collection = db.collection('announcements');

        // Create test announcement
        const announcement = {
            type: 'text',
            content: 'Test announcement - ' + new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active'
        };

        const result = await collection.insertOne(announcement);
        console.log('Announcement created:', result.insertedId);

        // Verify we can read it back
        const saved = await collection.findOne({ _id: result.insertedId });
        console.log('Retrieved announcement:', saved);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

testAnnouncement().catch(console.error);
