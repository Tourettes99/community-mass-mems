const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const inquirer = require('inquirer');
const chalk = require('chalk');
const boxen = require('boxen');

// RAL 2005 Bright Orange
const BRIGHT_ORANGE = '#FF4D06';

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

function formatMemory(memory) {
  const box = boxen(
    chalk`{white Title: ${memory.metadata?.title || 'No title'}}\n` +
    (memory.url ? chalk`{gray URL: ${memory.url}}\n` : '') +
    (memory.content ? chalk`{gray Content: ${memory.content}}\n` : '') +
    chalk`{gray Type: ${memory.metadata?.type || 'Unknown'}}\n` +
    chalk`{gray Description: ${memory.metadata?.description || 'No description'}}\n` +
    chalk`{gray Created: ${memory.createdAt.toLocaleString()}}\n` +
    chalk`{hex('${BRIGHT_ORANGE}')} ID: ${memory._id}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'gray'
    }
  );
  return box;
}

async function moderateMemories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(chalk.hex(BRIGHT_ORANGE).bold('\n📝 Community Mass Memories - Moderation Console\n'));

    while (true) {
      const memories = await Memory.find({ status: 'pending' }).sort({ createdAt: -1 });
      
      if (memories.length === 0) {
        console.log(chalk.gray('\nNo pending memories to moderate! 🎉\n'));
        break;
      }

      console.log(chalk.white.bold(`\nPending Memories: ${memories.length}`));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📋 View and moderate memories', value: 'moderate' },
            { name: '🔄 Refresh list', value: 'refresh' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        break;
      } else if (action === 'refresh') {
        continue;
      }

      const { memoryToModerate } = await inquirer.prompt([
        {
          type: 'list',
          name: 'memoryToModerate',
          message: 'Select a memory to moderate:',
          choices: memories.map(memory => ({
            name: `${memory.metadata?.title || memory.content?.substring(0, 50) || memory.url || 'Untitled'} (${memory.createdAt.toLocaleDateString()})`,
            value: memory._id
          }))
        }
      ]);

      const selectedMemory = memories.find(m => m._id.toString() === memoryToModerate.toString());
      console.log('\n' + formatMemory(selectedMemory));

      const { decision } = await inquirer.prompt([
        {
          type: 'list',
          name: 'decision',
          message: 'What would you like to do with this memory?',
          choices: [
            { name: '✅ Approve', value: 'approve' },
            { name: '❌ Reject', value: 'reject' },
            { name: '⬅️ Back to list', value: 'back' }
          ]
        }
      ]);

      if (decision === 'back') {
        continue;
      }

      selectedMemory.status = decision;
      await selectedMemory.save();
      
      console.log(chalk.hex(BRIGHT_ORANGE).bold(`\n✨ Memory ${decision}d successfully!\n`));
    }
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
  } finally {
    await mongoose.disconnect();
  }
}

// Start the interactive moderation
moderateMemories();
