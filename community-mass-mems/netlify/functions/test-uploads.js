require('dotenv').config();
const fetch = require('node-fetch');

const NETLIFY_URL = 'https://community-mass-mems.netlify.app';
const TEST_URLS = [
  // Video Platforms
  {
    category: 'Video - YouTube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    category: 'Video - Vimeo',
    url: 'https://vimeo.com/148751763'
  },
  {
    category: 'Video - TikTok',
    url: 'https://www.tiktok.com/@khaby.lame/video/7137723462233555205'
  },
  
  // Social Media
  {
    category: 'Social - Twitter',
    url: 'https://twitter.com/elonmusk/status/1759087542254297190'
  },
  {
    category: 'Social - Instagram',
    url: 'https://www.instagram.com/p/C3aKjN_yRHR/'
  },
  {
    category: 'Social - Facebook',
    url: 'https://www.facebook.com/watch?v=123456789'
  },
  
  // Audio Platforms
  {
    category: 'Audio - SoundCloud',
    url: 'https://soundcloud.com/imaginedragons/bones'
  },
  {
    category: 'Audio - Spotify',
    url: 'https://open.spotify.com/track/0V3wPSX9ygBnCm8psDIegu'
  },
  
  // Direct Media
  {
    category: 'Media - Image',
    url: 'https://picsum.photos/800/600'
  },
  {
    category: 'Media - Audio',
    url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav'
  },
  {
    category: 'Media - Video',
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4'
  },
  
  // Articles
  {
    category: 'Article - News',
    url: 'https://www.bbc.com/news/technology-68274417'
  },
  {
    category: 'Article - Blog',
    url: 'https://dev.to/lydiahallie/javascript-visualized-promises-async-await-5gke'
  }
];

async function testUrl(url, category) {
  try {
    console.log(`\nTesting ${category}:`);
    console.log(`URL: ${url}`);

    const uploadResponse = await fetch(`${NETLIFY_URL}/.netlify/functions/uploadUrl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        url: url,
        tags: ['test', category.toLowerCase().split(' ')[0]]
      })
    });

    const result = await uploadResponse.json();
    
    if (uploadResponse.ok) {
      console.log('✅ Success');
      console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
      return { success: true, data: result };
    } else {
      console.log('❌ Failed');
      console.log('Error:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('Starting URL upload tests...\n');
  
  const results = {
    total: TEST_URLS.length,
    successful: 0,
    failed: 0,
    details: []
  };

  for (const test of TEST_URLS) {
    const result = await testUrl(test.url, test.category);
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }
    results.details.push({
      category: test.category,
      url: test.url,
      success: result.success,
      data: result.success ? result.data : undefined,
      error: !result.success ? result.error : undefined
    });

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== Test Summary ===');
  console.log(`Total URLs: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\nFailed URLs:');
    results.details
      .filter(d => !d.success)
      .forEach(fail => {
        console.log(`- ${fail.category}: ${fail.error}`);
      });
  }

  return results;
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

// Export for use in Netlify Functions
exports.handler = async (event, context) => {
  try {
    const results = await runTests();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
}; 