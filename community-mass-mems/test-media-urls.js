const axios = require('axios');

const testUrls = [
  // Direct image
  {
    type: 'url',
    url: 'https://picsum.photos/800/600',
    metadata: {
      userNotes: 'Testing direct image URL',
      tags: ['image', 'test']
    }
  },
  // YouTube video
  {
    type: 'url',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    metadata: {
      userNotes: 'Testing YouTube preview and embed',
      tags: ['video', 'youtube']
    }
  },
  // Spotify track
  {
    type: 'url',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    metadata: {
      userNotes: 'Testing Spotify preview and embed',
      tags: ['audio', 'spotify']
    }
  },
  // Instagram post
  {
    type: 'url',
    url: 'https://www.instagram.com/p/CzgNRXeuumy/',
    metadata: {
      userNotes: 'Testing Instagram preview and embed',
      tags: ['social', 'instagram']
    }
  }
];

async function testMediaUrls() {
  for (const testData of testUrls) {
    try {
      console.log('\nTesting URL:', testData.url);
      console.log('Request data:', JSON.stringify(testData, null, 2));
      
      const response = await axios.post(
        'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/upload',
        testData
      );
      
      console.log('Upload successful!');
      console.log('Media Type:', response.data.memory.metadata.mediaType);
      console.log('Preview Type:', response.data.memory.metadata.previewType);
      console.log('Preview URL:', response.data.memory.metadata.previewUrl);
      console.log('Is Playable:', response.data.memory.metadata.isPlayable);
      if (response.data.memory.metadata.playbackHtml) {
        console.log('Has Playback HTML: Yes');
      }
    } catch (error) {
      console.error('Upload failed for URL:', testData.url);
      console.error('Error:', error.response ? error.response.data : error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
      }
    }
  }
}

testMediaUrls();
