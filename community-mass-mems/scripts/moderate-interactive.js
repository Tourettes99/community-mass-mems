#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
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
  try {
    await moderationService.initialize();
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log(chalk.green('Connected to MongoDB successfully!'));
    
    const db = client.db();
    const collection = db.collection('memories');
    
    const pendingMemories = await collection.find({ status: 'pending' }).toArray();
    
    if (pendingMemories.length === 0) {
      console.log(chalk.yellow('\nNo pending memories found.'));
      await client.close();
      rl.close();
      return;
    }
    
    console.log(chalk.cyan(`Found ${pendingMemories.length} pending memories.\n`));
    
    for (const memory of pendingMemories) {
      console.log(formatMemory(memory, pendingMemories.indexOf(memory)));
      
      console.log('\nAnalyzing content...');
      const content = memory.type === 'text' ? memory.content : memory.url;
      
      try {
        const moderationResult = await moderationService.moderateContent(content);
        
        // Automatic decision based on confidence scores
        if (moderationResult.flagged && moderationResult.categories_scores) {
          const maxScore = Math.max(...Object.values(moderationResult.categories_scores));
          
          if (maxScore > 0.8) {
            // High confidence rejection
            await collection.updateOne(
              { _id: memory._id },
              { $set: { status: 'rejected', moderationReason: 'Automatic rejection - high confidence violation' } }
            );
            console.log(chalk.red('Content automatically rejected due to high confidence violation'));
            
            // Send email notification for rejected content
            const emailContent = `Content was automatically rejected.\nID: ${memory._id}\nReason: High confidence violation\nScores: ${JSON.stringify(moderationResult.categories_scores, null, 2)}`;
            // TODO: Implement email notification
            
          } else if (maxScore > 0.4) {
            // Medium confidence - needs manual review
            console.log(chalk.yellow('Content requires manual review - medium confidence'));
            const answer = await askQuestion('Approve this content? (y/n): ');
            
            if (answer.toLowerCase() === 'y') {
              await collection.updateOne(
                { _id: memory._id },
                { $set: { status: 'approved' } }
              );
              console.log(chalk.green('Content approved'));
            } else {
              await collection.updateOne(
                { _id: memory._id },
                { $set: { status: 'rejected', moderationReason: 'Manual rejection after review' } }
              );
              console.log(chalk.red('Content rejected'));
            }
          } else {
            // Low confidence - auto approve
            await collection.updateOne(
              { _id: memory._id },
              { $set: { status: 'approved' } }
            );
            console.log(chalk.green('Content automatically approved - low risk score'));
          }
        } else {
          // No flags - auto approve
          await collection.updateOne(
            { _id: memory._id },
            { $set: { status: 'approved' } }
          );
          console.log(chalk.green('Content automatically approved - no flags'));
        }
      } catch (error) {
        console.error(chalk.red('Error during moderation:'), error);
        // Keep the content pending if there's an error
        console.log(chalk.yellow('Content will remain pending due to error'));
      }
      
      console.log('\n' + '-'.repeat(50) + '\n');
    }
    
    await client.close();
    rl.close();
    
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    rl.close();
  }
}

// Start the moderation process
console.log(chalk.cyan('Starting moderation interface...\n'));
moderateMemories().catch(console.error);
