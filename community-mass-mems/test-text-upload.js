const axios = require('axios');

const testMemory = {
  type: 'url',
  url: 'https://www.youtube.com/watch?v=LoVktJUS1zg',
  content: undefined,
  tags: ['youtube', 'video'],
  metadata: {
    description: 'YouTube Video Upload Test'
  }
};

async function uploadTestMemory() {
  try {
    console.log('Sending request to:', 'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/uploadUrl');
    console.log('Request data:', JSON.stringify(testMemory, null, 2));
    
    const response = await axios.post('https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/uploadUrl', testMemory);
    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Upload failed:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

uploadTestMemory();
