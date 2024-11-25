const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const readline = require('readline');
const Memory = require('../netlify/functions/models/Memory'); // Use the proper Memory model

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Format memory details with more context
function formatMemory(memory, index) {
  const lines = [
    '╔════════════════════════════════════════════════════════════',
    `║ MEMORY #${index + 1}`,
    '║ ' + '─'.repeat(55),
    `║ Created: ${memory.createdAt.toLocaleString()}`,
    `║ ID: ${memory._id}`,
    '║'
  ];

  // Basic Info Section
  if (memory.metadata?.title) {
    lines.push(`║ Title: ${memory.metadata.title}`);
  }

  if (memory.url) {
    lines.push('║');
    lines.push(`║ URL: ${memory.url}`);
    
    // Show URL metadata
    if (memory.metadata) {
      lines.push('║');
      lines.push('║ URL METADATA');
      lines.push('║ ' + '─'.repeat(30));

      // Platform-specific info
      if (memory.metadata.platform) {
        lines.push(`║ Platform: ${memory.metadata.platform.toUpperCase()}`);
        if (memory.metadata.videoId) {
          lines.push(`║ Video ID: ${memory.metadata.videoId}`);
        }
        if (memory.metadata.embedUrl) {
          lines.push(`║ Embed URL: ${memory.metadata.embedUrl}`);
        }
      }

      // File info for direct files
      if (memory.metadata.isDirectFile) {
        lines.push(`║ File Type: ${memory.metadata.fileType}`);
        if (memory.metadata.mimeType) {
          lines.push(`║ MIME Type: ${memory.metadata.mimeType}`);
        }
        if (memory.metadata.fileSize) {
          lines.push(`║ Size: ${(memory.metadata.fileSize / 1024).toFixed(2)} KB`);
        }
      }

      // Media info
      if (memory.metadata.mediaType) {
        lines.push(`║ Media Type: ${memory.metadata.mediaType}`);
      }
      if (memory.metadata.thumbnailUrl) {
        lines.push(`║ Thumbnail: ${memory.metadata.thumbnailUrl}`);
      }

      // OpenGraph Data
      if (memory.metadata.ogTitle || memory.metadata.ogDescription || memory.metadata.ogImage) {
        lines.push('║');
        lines.push('║ OPENGRAPH DATA');
        lines.push('║ ' + '─'.repeat(30));
        
        if (memory.metadata.ogTitle) {
          lines.push(`║ Title: ${memory.metadata.ogTitle}`);
        }
        if (memory.metadata.ogDescription) {
          lines.push('║ Description:');
          const descLines = memory.metadata.ogDescription.match(/.{1,45}/g) || [''];
          descLines.forEach(line => {
            lines.push(`║   ${line}`);
          });
        }
        if (memory.metadata.ogImage) {
          lines.push(`║ Image: ${memory.metadata.ogImage}`);
        }
        if (memory.metadata.ogType) {
          lines.push(`║ Type: ${memory.metadata.ogType}`);
        }
      }

      // Twitter Card Data
      if (memory.metadata.twitterTitle || memory.metadata.twitterDescription || memory.metadata.twitterImage) {
        lines.push('║');
        lines.push('║ TWITTER CARD DATA');
        lines.push('║ ' + '─'.repeat(30));
        
        if (memory.metadata.twitterCard) {
          lines.push(`║ Card Type: ${memory.metadata.twitterCard}`);
        }
        if (memory.metadata.twitterTitle) {
          lines.push(`║ Title: ${memory.metadata.twitterTitle}`);
        }
        if (memory.metadata.twitterDescription) {
          lines.push('║ Description:');
          const descLines = memory.metadata.twitterDescription.match(/.{1,45}/g) || [''];
          descLines.forEach(line => {
            lines.push(`║   ${line}`);
          });
        }
        if (memory.metadata.twitterImage) {
          lines.push(`║ Image: ${memory.metadata.twitterImage}`);
        }
      }

      // oEmbed Data
      if (memory.metadata.oembedType || memory.metadata.oembedTitle) {
        lines.push('║');
        lines.push('║ OEMBED DATA');
        lines.push('║ ' + '─'.repeat(30));
        
        if (memory.metadata.oembedType) {
          lines.push(`║ Type: ${memory.metadata.oembedType}`);
        }
        if (memory.metadata.oembedTitle) {
          lines.push(`║ Title: ${memory.metadata.oembedTitle}`);
        }
        if (memory.metadata.oembedAuthor) {
          lines.push(`║ Author: ${memory.metadata.oembedAuthor}`);
        }
        if (memory.metadata.oembedProvider) {
          lines.push(`║ Provider: ${memory.metadata.oembedProvider}`);
        }
      }

      // Description (if not shown in OG/Twitter data)
      if (memory.metadata.description && 
          memory.metadata.description !== memory.metadata.ogDescription && 
          memory.metadata.description !== memory.metadata.twitterDescription) {
        lines.push('║');
        lines.push('║ DESCRIPTION');
        lines.push('║ ' + '─'.repeat(30));
        const descLines = memory.metadata.description.match(/.{1,45}/g) || [''];
        descLines.forEach(line => {
          lines.push(`║ ${line}`);
        });
      }
    }
  }

  if (memory.content) {
    lines.push('║');
    lines.push('║ CONTENT');
    lines.push('║ ' + '─'.repeat(30));
    const contentLines = memory.content.split('\n');
    contentLines.forEach(line => {
      const wrappedLines = line.match(/.{1,50}/g) || [''];
      wrappedLines.forEach(wrapped => {
        lines.push(`║ ${wrapped}`);
      });
    });
  }

  lines.push('╚════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

// Display memories
async function displayMemories(memories) {
  if (memories.length === 0) {
    console.log('\nNo pending memories to moderate.');
    return;
  }

  console.log(`\n${memories.length} Pending ${memories.length === 1 ? 'Memory' : 'Memories'}:\n`);
  
  memories.forEach((memory, index) => {
    console.log(formatMemory(memory, index));
  });

  console.log('\nCommands:');
  console.log('  r - Refresh list');
  console.log('  q - Quit');
  console.log('  [number] a - Approve memory (e.g., "1a" approves Memory #1)');
  console.log('  [number] r - Reject memory (e.g., "2r" rejects Memory #2)');
  console.log('\nExample: Type "1a" and press Enter to approve Memory #1\n');
}

async function moderateMemories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n=== Community Mass Memories - Moderation Console ===\n');

    let memories = [];
    
    async function refreshMemories() {
      memories = await Memory.find({ status: 'pending' }).sort({ createdAt: -1 });
      console.clear();
      console.log('\n=== Community Mass Memories - Moderation Console ===\n');
      await displayMemories(memories);
    }

    // Initial load
    await refreshMemories();

    rl.on('line', async (input) => {
      input = input.trim().toLowerCase();
      
      if (input === 'q') {
        rl.close();
      } else if (input === 'r') {
        await refreshMemories();
      } else if (input.match(/^\d+[ar]$/)) {
        const index = parseInt(input.slice(0, -1)) - 1;
        const action = input.slice(-1);
        
        if (index >= 0 && index < memories.length) {
          const memory = memories[index];
          memory.status = action === 'a' ? 'approved' : 'rejected';
          await memory.save();
          console.log(`\nMemory #${index + 1} ${action === 'a' ? 'approved' : 'rejected'}!\n`);
          await refreshMemories();
        } else {
          console.log('\nInvalid memory number! Try again.\n');
        }
      } else if (input) {
        console.log('\nInvalid command! Try again.\n');
      }
    });

    rl.on('close', async () => {
      await mongoose.disconnect();
      console.log('\nGoodbye! 👋\n');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Start the moderation process
moderateMemories();
