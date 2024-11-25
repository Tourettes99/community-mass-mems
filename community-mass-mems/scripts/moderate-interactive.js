const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define Memory Schema
const memorySchema = new mongoose.Schema({
  content: String,
  url: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  metadata: {
    title: String,
    description: String,
    type: String,
    image: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Memory = mongoose.model('Memory', memorySchema);

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

  if (memory.metadata?.title) {
    lines.push(`║ Title: ${memory.metadata.title}`);
  }

  if (memory.url) {
    lines.push(`║ URL: ${memory.url}`);
    if (memory.metadata?.type === 'image') {
      lines.push('║ Type: Image from URL');
    } else if (memory.metadata?.type === 'webpage') {
      lines.push('║ Type: Web Page');
    }
  }

  if (memory.content) {
    lines.push('║ Content:');
    // Split content into lines and wrap them
    const contentLines = memory.content.split('\n');
    contentLines.forEach(line => {
      // Wrap long lines
      const wrappedLines = line.match(/.{1,50}/g) || [''];
      wrappedLines.forEach(wrapped => {
        lines.push(`║   ${wrapped}`);
      });
    });
  }

  if (memory.metadata?.description) {
    lines.push('║');
    lines.push(`║ Description: ${memory.metadata.description}`);
  }

  lines.push('╚════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

// Show menu options
function showMenu() {
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
      
      if (memories.length === 0) {
        console.log('No pending memories to moderate! 🎉\n');
      } else {
        console.log(`${memories.length} Pending Memories:\n`);
        memories.forEach((memory, index) => {
          console.log(formatMemory(memory, index));
        });
      }
      showMenu();
    }

    // Initial load
    await refreshMemories();

    // Handle commands
    rl.on('line', async (input) => {
      input = input.trim().toLowerCase();
      
      if (input === 'q') {
        rl.close();
        return;
      }
      
      if (input === 'r') {
        await refreshMemories();
        return;
      }
      
      // Parse commands like "1a" or "2r"
      const match = input.match(/^(\d+)([ar])$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const action = match[2] === 'a' ? 'approve' : 'reject';
        
        if (index >= 0 && index < memories.length) {
          const memory = memories[index];
          memory.status = action === 'approve' ? 'approved' : 'rejected';
          await memory.save();
          console.log(`\nMemory #${index + 1} has been ${action}d! ✅\n`);
          await refreshMemories();
        } else {
          console.log('\nInvalid memory number! Try again.\n');
        }
      } else if (input) {
        console.log('\nInvalid command! Try again.\n');
        showMenu();
      }
    });

    rl.on('close', async () => {
      await mongoose.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
  }
}

// Start the moderation process
moderateMemories();
