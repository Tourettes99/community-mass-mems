const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

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

async function listPendingMemories() {
  try {
    const memories = await Memory.find({ status: 'pending' }).sort({ createdAt: -1 });
    console.log('\nPending Memories:');
    console.log('----------------');
    
    if (memories.length === 0) {
      console.log('No pending memories found.');
      return;
    }

    memories.forEach((memory, index) => {
      console.log(`\n${index + 1}. Memory ID: ${memory._id}`);
      console.log(`   Created: ${memory.createdAt.toLocaleString()}`);
      if (memory.url) {
        console.log(`   URL: ${memory.url}`);
      }
      if (memory.content) {
        console.log(`   Content: ${memory.content}`);
      }
      console.log(`   Title: ${memory.metadata?.title || 'No title'}`);
      console.log(`   Type: ${memory.metadata?.type || 'Unknown'}`);
    });
  } catch (error) {
    console.error('Error listing memories:', error);
  }
}

async function moderateMemory(memoryId, action) {
  try {
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      console.log(`Memory with ID ${memoryId} not found.`);
      return;
    }

    memory.status = action;
    await memory.save();
    console.log(`Memory ${memoryId} has been ${action}.`);
  } catch (error) {
    console.error('Error moderating memory:', error);
  }
}

async function main() {
  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const memoryId = args[1];
    const action = args[2];

    if (command === 'list') {
      await listPendingMemories();
    } else if (command === 'moderate' && memoryId && action) {
      if (!['approve', 'reject'].includes(action)) {
        console.log('Action must be either "approve" or "reject"');
        return;
      }
      await moderateMemory(memoryId, action);
    } else {
      console.log(`
Usage:
  List pending memories:   node moderate.js list
  Moderate a memory:      node moderate.js moderate <memoryId> <approve|reject>

Examples:
  node moderate.js list
  node moderate.js moderate 507f1f77bcf86cd799439011 approve
  node moderate.js moderate 507f1f77bcf86cd799439011 reject
      `);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
