const fetch = require('node-fetch');

async function testLiveYoutubeEmbed() {
  const testUrl = 'https://www.youtube.com/watch?v=XIN5mSk1ovI&t=224s';
  const NETLIFY_URL = 'https://mass-mems.netlify.app';  // Updated URL
  
  try {
    // Step 1: Submit the URL
    console.log('Submitting URL to live Netlify site:', testUrl);
    const submitResponse = await fetch(`${NETLIFY_URL}/.netlify/functions/uploadUrl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      throw new Error(`Failed to submit URL: ${error}`);
    }

    const submitData = await submitResponse.json();
    console.log('\nSubmit Response:', JSON.stringify(submitData, null, 2));

    // Step 2: Wait a moment for processing
    console.log('\nWaiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Fetch memories to verify display
    console.log('\nFetching memories to verify...');
    const memoriesResponse = await fetch(`${NETLIFY_URL}/.netlify/functions/getMemories`);
    
    if (!memoriesResponse.ok) {
      throw new Error('Failed to fetch memories');
    }

    const memories = await memoriesResponse.json();
    const youtubeMemory = memories.find(m => m.url === testUrl);

    if (!youtubeMemory) {
      throw new Error('Could not find the submitted YouTube URL in memories');
    }

    // Step 4: Verify the metadata and embed
    console.log('\nVerifying YouTube memory:');
    console.log('Memory ID:', youtubeMemory._id);
    console.log('Title:', youtubeMemory.metadata.title);
    console.log('Type:', youtubeMemory.metadata.mediaType);
    console.log('Site Name:', youtubeMemory.metadata.siteName);
    console.log('\nEmbed HTML present:', !!youtubeMemory.metadata.embedHtml);
    
    if (youtubeMemory.metadata.embedHtml) {
      console.log('\nEmbed HTML preview (first 200 chars):');
      console.log(youtubeMemory.metadata.embedHtml.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

// Run the test
testLiveYoutubeEmbed();
