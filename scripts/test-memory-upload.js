const { MongoClient } = require('mongodb');

async function testMemoryUpload() {
    const uri = "mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('mass-mems');
        const collection = db.collection('memories');

        // Create test memory (URL type)
        const urlMemory = {
            type: 'url',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            tags: ['test', 'url'],
            status: 'approved',
            metadata: {
                title: 'Test URL Memory',
                description: 'Testing URL upload functionality',
                mediaType: 'video',
                platform: 'youtube.com',
                domain: 'youtube.com',
                isSecure: true,
                siteName: 'YouTube',
                embedHtml: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
                thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                dimensions: {
                    width: 560,
                    height: 315
                }
            },
            submittedAt: new Date().toISOString(),
            votes: {
                up: 0,
                down: 0
            },
            userVotes: new Map()
        };

        // Create test memory (Text type)
        const textMemory = {
            type: 'text',
            content: 'Test text memory - ' + new Date().toISOString(),
            tags: ['test', 'text'],
            status: 'approved',
            metadata: {
                title: 'Test Text Memory',
                description: 'Testing text upload functionality',
                mediaType: 'text',
                format: 'text/plain'
            },
            submittedAt: new Date().toISOString(),
            votes: {
                up: 0,
                down: 0
            },
            userVotes: new Map()
        };

        // Insert both test memories
        const urlResult = await collection.insertOne(urlMemory);
        console.log('URL memory created:', urlResult.insertedId);

        const textResult = await collection.insertOne(textMemory);
        console.log('Text memory created:', textResult.insertedId);

        // Verify we can read them back
        const savedUrl = await collection.findOne({ _id: urlResult.insertedId });
        console.log('Retrieved URL memory:', savedUrl);

        const savedText = await collection.findOne({ _id: textResult.insertedId });
        console.log('Retrieved text memory:', savedText);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

testMemoryUpload().catch(console.error);
