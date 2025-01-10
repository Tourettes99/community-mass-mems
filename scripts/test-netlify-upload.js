require('dotenv').config();
const { handler } = require('../netlify/functions/uploadUrl');

async function testNetlifyUpload() {
    console.log('Testing Netlify upload functionality...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');

    // Test data for different types of uploads
    const testCases = [
        {
            name: 'YouTube Video',
            event: {
                httpMethod: 'POST',
                body: JSON.stringify({
                    type: 'url',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    tags: ['test', 'youtube']
                })
            }
        },
        {
            name: 'Text Memory',
            event: {
                httpMethod: 'POST',
                body: JSON.stringify({
                    type: 'text',
                    content: 'This is a test memory',
                    tags: ['test', 'text']
                })
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\nTesting ${testCase.name}...`);
        try {
            // Create mock context that Netlify would normally provide
            const context = {
                callbackWaitsForEmptyEventLoop: true,
                functionName: 'uploadUrl',
                functionVersion: '1.0',
                invokedFunctionArn: 'test',
                memoryLimitInMB: '1024',
                awsRequestId: 'test',
                logGroupName: 'test',
                logStreamName: 'test',
                identity: null,
                clientContext: null
            };

            const response = await handler(testCase.event, context);
            console.log('Status Code:', response.statusCode);
            console.log('Response:', response.body);
            
            if (response.statusCode === 200) {
                console.log('✅ Test passed');
            } else {
                console.log('❌ Test failed');
            }
        } catch (error) {
            console.error('❌ Test error:', error);
        }
        
        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Run the tests
testNetlifyUpload().catch(console.error);
