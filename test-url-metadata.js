const axios = require('axios');

const testUrls = [
  // YouTube video
  {
    type: 'url',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    metadata: {
      userNotes: 'Testing YouTube embed',
      tags: ['music', 'video']
    }
  },
  // Twitter post
  {
    type: 'url',
    url: 'https://twitter.com/OpenAI/status/1729546054753513669',
    metadata: {
      userNotes: 'Testing Twitter embed',
      tags: ['ai', 'news']
    }
  },
  // News article
  {
    type: 'url',
    url: 'https://www.theverge.com',
    metadata: {
      userNotes: 'Testing article metadata',
      tags: ['tech', 'news']
    }
  }
];

async function testUrlUploads() {
  for (const testData of testUrls) {
    try {
      console.log('\nTesting URL:', testData.url);
      console.log('Request data:', JSON.stringify(testData, null, 2));
      
      const response = await axios.post(
        'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/upload',
        testData
      );
      
      console.log('Upload successful!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Upload failed for URL:', testData.url);
      console.error('Error:', error.response ? error.response.data : error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
      }
    }
  }
}

testUrlUploads();
