require('dotenv').config();
const fetch = require('node-fetch');

// Test URLs for different types of content
const TEST_CASES = [
    {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'youtube',
        expectedPlatform: 'youtube'
    },
    {
        url: 'https://twitter.com/elonmusk/status/1234567890',
        type: 'twitter',
        expectedPlatform: 'twitter'
    },
    {
        url: 'https://www.instagram.com/p/abcdef123456/',
        type: 'instagram',
        expectedPlatform: 'instagram'
    }
];

const PROD_URL = 'https://shiny-jalebi-9ccb2b.netlify.app';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 12; // 1 minute total polling time

async function testEmbedDisplay(testCase) {
    console.log(`\nTesting embed display for ${testCase.type}...`);
    console.log(`URL: ${testCase.url}`);

    try {
        // 1. Upload the URL
        console.log('Uploading URL...');
        const uploadResponse = await fetch(`${PROD_URL}/.netlify/functions/uploadUrl`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                type: 'url',
                url: testCase.url,
                tags: ['test', testCase.type]
            })
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadData = await uploadResponse.json();
        const memoryId = uploadData.id || uploadData._id;
        console.log(`Upload successful! Memory ID: ${memoryId}`);

        // 2. Poll for memory status and embed processing
        console.log('Polling for embed processing...');
        let retries = 0;
        let memory = null;

        while (retries < MAX_RETRIES) {
            const statusResponse = await fetch(`${PROD_URL}/.netlify/functions/getMemories?id=${memoryId}`);
            if (!statusResponse.ok) {
                throw new Error(`Failed to get memory status: ${statusResponse.status}`);
            }

            const memories = await statusResponse.json();
            memory = Array.isArray(memories) ? memories[0] : memories;

            if (!memory) {
                throw new Error('Memory not found');
            }

            // Check if embed is processed
            if (memory.metadata && memory.metadata.embedUrl) {
                console.log('✅ Embed processed successfully!');
                break;
            }

            console.log(`Waiting for embed processing... (${retries + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            retries++;
        }

        if (retries >= MAX_RETRIES) {
            throw new Error('Embed processing timed out');
        }

        // 3. Verify embed details
        console.log('\nVerifying embed details:');
        console.log('------------------------');
        console.log(`Platform: ${memory.metadata?.platform || 'Not set'}`);
        console.log(`Embed URL: ${memory.metadata?.embedUrl || 'Not set'}`);
        console.log(`Title: ${memory.metadata?.title || 'Not set'}`);
        console.log(`Description: ${memory.metadata?.description || 'Not set'}`);

        // Check if platform matches expected
        if (memory.metadata?.platform === testCase.expectedPlatform) {
            console.log('✅ Platform verification passed');
        } else {
            console.log('❌ Platform verification failed');
            console.log(`Expected: ${testCase.expectedPlatform}`);
            console.log(`Got: ${memory.metadata?.platform}`);
        }

        // Check if embed URL is present
        if (memory.metadata?.embedUrl) {
            console.log('✅ Embed URL is present');
        } else {
            console.log('❌ Embed URL is missing');
        }

        return true;
    } catch (error) {
        console.error(`❌ Test failed for ${testCase.type}:`);
        console.error(`Error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('Starting embed display tests...');
    console.log(`Testing against: ${PROD_URL}`);
    console.log('=========================\n');

    let passedTests = 0;
    for (const testCase of TEST_CASES) {
        if (await testEmbedDisplay(testCase)) {
            passedTests++;
        }
    }

    console.log('\n=========================');
    console.log(`Tests completed: ${passedTests}/${TEST_CASES.length} passed`);
    process.exit(passedTests === TEST_CASES.length ? 0 : 1);
}

// Run the tests
runTests();
