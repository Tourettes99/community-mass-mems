#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

// Format memory details with more context
function formatMemory(memory, index) {
  const lines = [
    '╔════════════════════════════════════════════════════════════',
    '║ MEMORY #' + (index + 1),
    '║ ' + '─'.repeat(55),
    '║ Created: ' + new Date(memory.createdAt).toLocaleString(),
    '║ ID: ' + memory._id,
    '║'
  ];

  // Title from metadata
  if (memory.metadata?.title) {
    lines.push('║ Title: ' + memory.metadata.title);
  }

  // URL or Content
  if (memory.url) {
    lines.push('║');
    lines.push('║ URL: ' + memory.url);
  } else if (memory.content) {
    lines.push('║');
    lines.push('║ CONTENT');
    lines.push('║ ' + '─'.repeat(30));
    const contentLines = memory.content.split('\n');
    contentLines.forEach(line => {
      const wrappedLines = line.match(/.{1,50}/g) || [''];
      wrappedLines.forEach(wrapped => {
        lines.push('║ ' + wrapped);
      });
    });
  }

  // Tags
  if (memory.tags && memory.tags.length > 0) {
    lines.push('║');
    lines.push('║ TAGS');
    lines.push('║ ' + '─'.repeat(30));
    lines.push('║ ' + memory.tags.join(', '));
  }

  // Metadata section
  if (memory.metadata) {
    lines.push('║');
    lines.push('║ METADATA');
    lines.push('║ ' + '─'.repeat(30));

    // Platform info
    if (memory.metadata.platform) {
      lines.push('║ Platform: ' + memory.metadata.platform.toUpperCase());
    }

    // Author info
    if (memory.metadata.author) {
      lines.push('║ Author: ' + memory.metadata.author);
    }
    if (memory.metadata.authorUrl) {
      lines.push('║ Channel: ' + memory.metadata.authorUrl);
    }

    // Video info
    if (memory.metadata.videoId) {
      lines.push('║ Video ID: ' + memory.metadata.videoId);
    }
    if (memory.metadata.embedUrl) {
      lines.push('║ Embed URL: ' + memory.metadata.embedUrl);
    }

    // Media type
    if (memory.metadata.mediaType) {
      lines.push('║ Media Type: ' + memory.metadata.mediaType);
    }

    // Thumbnail
    if (memory.metadata.thumbnailUrl) {
      lines.push('║ Thumbnail: ' + memory.metadata.thumbnailUrl);
    }

    // HTML embed code
    if (memory.metadata.html) {
      lines.push('║');
      lines.push('║ EMBED CODE');
      lines.push('║ ' + '─'.repeat(30));
      const embedLines = memory.metadata.html.match(/.{1,50}/g) || [''];
      embedLines.forEach(line => {
        lines.push('║ ' + line);
      });
    }
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

  console.log('\n' + memories.length + ' Pending ' + (memories.length === 1 ? 'Memory' : 'Memories') + ':\n');
  
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
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    family: 4
  });

  try {
    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!\n');

    const db = client.db('memories');
    const collection = db.collection('memories');
    
    console.log('=== Community Mass Memories - Moderation Console ===\n');

    let memories = [];
    let lastMemoryCount = 0;
    let checkInterval;
    
    async function refreshMemories(force = false) {
      try {
        console.log('\nFetching pending memories...');
        const newMemories = await collection.find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
        
        // Only refresh display if there are new memories or forced refresh
        if (force || newMemories.length !== lastMemoryCount) {
          memories = newMemories;
          lastMemoryCount = memories.length;
          console.clear();
          console.log('\n=== Community Mass Memories - Moderation Console ===\n');
          await displayMemories(memories);
          
          // Play notification sound if new memories were added
          if (!force && newMemories.length > lastMemoryCount) {
            console.log('\n New memories have been submitted!\n');
            process.stdout.write('\x07'); // System beep
          }
        }
      } catch (error) {
        console.error('\nError fetching memories:', error.message);
        console.error('\nPlease check your connection and try again.\n');
      }
    }

    // Initial load
    await refreshMemories(true);

    // Set up auto-refresh every 30 seconds
    checkInterval = setInterval(() => refreshMemories(), 30000);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', async (input) => {
      input = input.trim().toLowerCase();
      
      if (input === 'q') {
        clearInterval(checkInterval);
        rl.close();
      } else if (input === 'r') {
        await refreshMemories(true);
      } else if (input.match(/^\d+[ar]$/)) {
        const index = parseInt(input.slice(0, -1)) - 1;
        const action = input.slice(-1);
        
        if (index >= 0 && index < memories.length) {
          try {
            const memory = memories[index];
            await collection.updateOne(
              { _id: memory._id },
              { $set: { status: action === 'a' ? 'approved' : 'rejected' } }
            );
            console.log('\nMemory #' + (index + 1) + ' ' + (action === 'a' ? 'approved' : 'rejected') + '!\n');
            await refreshMemories(true);
          } catch (error) {
            console.error('\nError updating memory:', error.message);
            console.log('\nPress r to refresh or q to quit\n');
          }
        } else {
          console.log('\nInvalid memory number! Try again.\n');
        }
      } else if (input) {
        console.log('\nInvalid command! Try again.\n');
      }
    });

    rl.on('close', async () => {
      clearInterval(checkInterval);
      try {
        await client.close();
        console.log('\nDisconnected from MongoDB');
        console.log('Goodbye! \n');
      } catch (error) {
        console.error('\nError disconnecting:', error.message);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('\nUnexpected error:', error.message);
    try {
      await client.close();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Cleaning up...');
  try {
    await client.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    // Ignore disconnect errors
  }
  process.exit(0);
});

// Start the moderation process
moderateMemories();
