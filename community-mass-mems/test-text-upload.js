const axios = require('axios');

const testMemory = {
  type: 'text',
  content: 'This is a test memory text content. It could be a story, thought, or any other text-based memory.',
  metadata: {
    description: 'Test Text Memory'
  }
};

async function uploadTestMemory() {
  try {
    console.log('Sending request to:', 'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/upload');
    console.log('Request data:', JSON.stringify(testMemory, null, 2));
    
    const response = await axios.post('https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/upload', testMemory);
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
