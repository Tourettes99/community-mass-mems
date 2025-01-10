require('dotenv').config();
const fetch = require('node-fetch');
const chalk = require('chalk');

// Test cases with different types of content
const testCases = [
  {
    name: 'Safe Content',
    type: 'text',
    content: 'This is a happy memory about playing games with friends.'
  },
  {
    name: 'Hate Speech',
    type: 'text',
    content: '[HATE SPEECH CONTENT REMOVED]'
  },
  {
    name: 'Safe URL',
    type: 'url',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    name: 'Violent Content',
    type: 'text',
    content: '[VIOLENT CONTENT REMOVED]'
  },
  {
    name: 'Self-Harm Content',
    type: 'text',
    content: '[SELF-HARM CONTENT REMOVED]'
  },
  {
    name: 'Multiple Violations',
    type: 'text',
    content: '[MULTIPLE VIOLATION CONTENT REMOVED]'
  }
];

async function testModeration() {
  console.log(chalk.blue('Testing moderation error handling...\n'));

  const NETLIFY_URL = process.env.SITE_URL || 'https://shiny-jalebi-9ccb2b.netlify.app';
  const API_ENDPOINT = `${NETLIFY_URL}/.netlify/functions/uploadText`;

  for (const testCase of testCases) {
    console.log(chalk.yellow(`\nTesting: ${testCase.name}`));
    console.log(chalk.cyan('Content Type:'), testCase.type);
    console.log(chalk.cyan('Content:'), testCase.type === 'url' ? testCase.url : testCase.content);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user-123' // For testing user tracking
        },
        body: JSON.stringify({
          type: testCase.type,
          content: testCase.type === 'url' ? testCase.url : testCase.content
        })
      });

      const result = await response.json();

      console.log(chalk.magenta('\nResponse:'));
      console.log('Status Code:', chalk.cyan(response.status));

      if (result.error) {
        // Moderation rejection or other error
        console.log(chalk.red('\nError Details:'));
        if (result.error.code?.startsWith('M')) {
          // Moderation error
          console.log('Error Code:', chalk.cyan(result.error.code));
          console.log('Category:', chalk.cyan(result.error.message));
          console.log('User Message:', chalk.yellow(result.error.userMessage));
          
          if (result.error.details) {
            console.log('\nViolation Details:');
            result.error.details.forEach(detail => {
              console.log(chalk.cyan(`- ${detail.category}: ${detail.score}`));
              console.log(chalk.gray(`  ${detail.description}`));
            });
          }

          if (result.error.helpResources) {
            console.log('\nHelp Resources:');
            result.error.helpResources.forEach(resource => {
              console.log(chalk.cyan(`- ${resource.name}`));
              console.log(chalk.gray(`  ${resource.description}`));
              if (resource.contact) console.log(chalk.gray(`  Contact: ${resource.contact}`));
              if (resource.url) console.log(chalk.gray(`  URL: ${resource.url}`));
            });
          }
        } else {
          // System error
          console.log('Error:', chalk.red(result.error.message));
          if (result.error.details) {
            console.log('Details:', chalk.gray(result.error.details));
          }
        }
      } else {
        // Success
        console.log(chalk.green('\nSuccess:'));
        console.log('Message:', chalk.cyan(result.message));
        console.log('Memory ID:', chalk.cyan(result.id));
        console.log('Status:', chalk.cyan(result.status));
      }

      console.log('\nRequest ID:', chalk.cyan(result.requestId));
    } catch (error) {
      console.error(chalk.red('\nError making request:'), error.message);
    }

    // Add a separator between test cases
    console.log(chalk.gray('\n' + '-'.repeat(80)));
  }
}

// Run the tests
testModeration().catch(console.error);
