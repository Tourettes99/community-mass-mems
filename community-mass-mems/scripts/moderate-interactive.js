#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');
const chalk = require('chalk');
const { extractUrlMetadata } = require('../netlify/functions/utils/metadata');
const moderationService = require('./services/moderationService');

// Format memory details with more context
function formatMemory(memory, index) {
  const lines = [
    `\n${chalk.cyan('='.repeat(20))} Memory ${index + 1} ${chalk.cyan('='.repeat(20))}`,
    `ID: ${chalk.yellow(memory._id)}`,
    `Type: ${chalk.blue(memory.type)}`,
    `Status: ${chalk.magenta(memory.status)}`,
    `Created: ${chalk.green(memory.createdAt ? new Date(memory.createdAt).toLocaleString() : 'Unknown')}`
  ];

  if (memory.type === 'url') {
    lines.push(`URL: ${chalk.blue(memory.url)}`);
    if (memory.metadata) {
      lines.push('\nCurrent Metadata:');
      lines.push(`Title: ${memory.metadata.title || 'No title'}`);
      lines.push(`Description: ${memory.metadata.description || 'No description'}`);
      lines.push(`Site: ${memory.metadata.siteName || 'Unknown site'}`);
      lines.push(`Media Type: ${memory.metadata.mediaType || 'Unknown type'}`);
      if (memory.metadata.embedHtml) {
        lines.push('Embed: Available');
      }
    }
  } else if (memory.type === 'text') {
    lines.push(`Content: ${chalk.white(memory.content)}`);
  }

  if (memory.tags && memory.tags.length > 0) {
    lines.push(`\nTags: ${chalk.yellow(memory.tags.join(', '))}`);
  }

  return lines.join('\n');
}

// Format metadata details
function formatMetadata(metadata) {
  const lines = [
    '\nFresh Metadata:',
    `Title: ${metadata.title || 'No title'}`,
    `Description: ${metadata.description || 'No description'}`,
    `Site: ${metadata.siteName || 'Unknown site'}`,
    `Media Type: ${metadata.mediaType || 'Unknown type'}`,
    `Preview URL: ${metadata.previewUrl || 'No preview'}`
  ];

  if (metadata.embedHtml) {
    lines.push('Embed HTML: Available');
  }

  if (metadata.author) {
    lines.push(`Author: ${metadata.author}`);
  }

  return lines.join('\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetWeeklyPosts(collection) {
  const confirm = await askQuestion('\nAre you sure you want to reset the weekly post counter? (y/n): ');
  if (confirm.toLowerCase() === 'y') {
    // Get current date and start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Set to Sunday

    // Update all approved posts to have submittedAt before startOfWeek
    await collection.updateMany(
      { status: 'approved', submittedAt: { $gte: startOfWeek.toISOString() } },
      { $set: { submittedAt: new Date(startOfWeek.getTime() - 1000) } } // Set to 1 second before start of week
    );
    console.log(chalk.green('Weekly post counter has been reset successfully.'));
  }
}

async function moderateMemories() {
  let client;
  try {
    // Initialize moderation service
    await moderationService.initialize();
    
    client = await MongoClient.connect(process.env.MONGODB_URI);
    console.log(chalk.green('Connected to MongoDB successfully!\n'));

    const db = client.db('memories');
    const collection = db.collection('memories');

    while (true) {
      const action = await askQuestion(
        chalk.cyan('\nMain Menu:\n') +
        '1. Moderate pending posts\n' +
        '2. Reset weekly post counter\n' +
        '3. Quit\n' +
        chalk.yellow('Choose action (1-3): ')
      );

      switch (action) {
        case '1':
          // Get pending memories
          const pendingMemories = await collection.find({ status: 'pending' }).toArray();
          
          if (pendingMemories.length === 0) {
            console.log(chalk.yellow('No pending memories to moderate.'));
            continue;
          }

          console.log(chalk.blue(`Found ${pendingMemories.length} pending memories.`));

          for (let i = 0; i < pendingMemories.length; i++) {
            const memory = pendingMemories[i];
            console.log(formatMemory(memory, i));

            // Run content through moderation service
            const moderationResult = await moderationService.moderateContent(
              memory.type === 'text' ? memory.content : memory,
              memory.type
            );

            if (memory.type === 'url') {
              const refreshMetadata = await askQuestion('\nRefresh metadata? (y/n): ');
              if (refreshMetadata.toLowerCase() === 'y') {
                try {
                  console.log('\nFetching fresh metadata...');
                  const metadata = await extractUrlMetadata(memory.url);
                  console.log(formatMetadata(metadata));

                  const updateMetadata = await askQuestion('\nUpdate with fresh metadata? (y/n): ');
                  if (updateMetadata.toLowerCase() === 'y') {
                    await collection.updateOne(
                      { _id: memory._id },
                      { $set: { metadata: metadata } }
                    );
                    console.log(chalk.green('Metadata updated successfully.'));
                  }
                } catch (error) {
                  console.error(chalk.red('Error refreshing metadata:'), error.message);
                }
              }
            }

            // Show moderation recommendation
            console.log(chalk.yellow('\nModeration Recommendation:'), 
              moderationResult.decision === 'approve' ? chalk.green(moderationResult.decision) :
              moderationResult.decision === 'reject' ? chalk.red(moderationResult.decision) :
              chalk.yellow(moderationResult.decision)
            );
            console.log(chalk.yellow('Reason:'), moderationResult.reason);

            const memoryAction = await askQuestion(
              '\nActions:\n' +
              '1. Approve\n' +
              '2. Reject\n' +
              '3. Skip\n' +
              '4. Edit tags\n' +
              '5. Back to main menu\n' +
              'Choose action (1-5): '
            );

            switch (memoryAction) {
              case '1':
                await collection.updateOne(
                  { _id: memory._id },
                  { 
                    $set: { 
                      status: 'approved',
                      moderatedAt: new Date(),
                      votes: { up: 0, down: 0 },
                      userVotes: {},
                      moderationResult: moderationResult
                    }
                  }
                );
                console.log(chalk.green('Memory approved.'));
                break;

              case '2':
                await collection.updateOne(
                  { _id: memory._id },
                  { 
                    $set: { 
                      status: 'rejected',
                      moderatedAt: new Date(),
                      moderationResult: moderationResult
                    }
                  }
                );
                console.log(chalk.red('Memory rejected.'));
                break;

              case '3':
                console.log(chalk.yellow('Skipping to next memory.'));
                break;

              case '4':
                const currentTags = memory.tags || [];
                console.log(`\nCurrent tags: ${chalk.yellow(currentTags.join(', ') || 'None')}`);
                const newTags = await askQuestion('Enter new tags (comma-separated) or press enter to keep current: ');
                
                if (newTags.trim()) {
                  const tagArray = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
                  await collection.updateOne(
                    { _id: memory._id },
                    { $set: { tags: tagArray } }
                  );
                  console.log(chalk.green('Tags updated successfully.'));
                }
                break;

              case '5':
                i = pendingMemories.length; // Exit the loop
                break;

              default:
                console.log(chalk.yellow('Invalid choice. Skipping to next memory.'));
            }
          }
          break;

        case '2':
          await resetWeeklyPosts(collection);
          break;

        case '3':
          console.log(chalk.green('Exiting moderation...'));
          return;

        default:
          console.log(chalk.red('Invalid choice. Please try again.'));
      }
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error);
  } finally {
    if (client) {
      await client.close();
    }
    rl.close();
  }
}

// Start the moderation process
console.log(chalk.cyan('Starting moderation interface...\n'));
moderateMemories().catch(console.error);
