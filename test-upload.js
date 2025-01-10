const axios = require('axios');

const testMemory = {
  type: 'url',
  url: 'https://example.com',
  metadata: {
    description: 'Test Memory'
  }
};

async function uploadTestMemory() {
  try {
    const endpoint = 'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/file-upload';
    console.log('Sending request to:', endpoint);
    console.log('Request data:', JSON.stringify(testMemory, null, 2));
    
    const response = await axios.post(endpoint, testMemory, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Upload failed:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

uploadTestMemory();
