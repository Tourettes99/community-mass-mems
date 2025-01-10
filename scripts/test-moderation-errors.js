require('dotenv').config();
const chalk = require('chalk');
const { MongoClient } = require('mongodb');
const { handler: uploadTextHandler } = require('../netlify/functions/uploadText');
const { handler: uploadUrlHandler } = require('../netlify/functions/uploadUrl');
const { testDatabaseHealth } = require('../netlify/functions/utils/dbErrors');

// Test cases with different types of content
const moderationTestCases = [
  {
    name: 'Safe Content',
    type: 'text',
    content: 'This is a happy memory about playing games with friends.'
  },
  {
    name: 'Hate Speech',
    type: 'text',
    content: 'I hate all people from that country, they are terrible!'
  },
  {
    name: 'Safe URL',
    type: 'url',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    name: 'Violent Content',
    type: 'text',
    content: 'I want to hurt them all, they deserve to suffer!'
  },
  {
    name: 'Self-Harm Content',
    type: 'text',
    content: 'I feel like ending it all, no one would miss me anyway.'
  },
  {
    name: 'Multiple Violations',
    type: 'text',
    content: 'I hate them and want to hurt them all! They should die!'
  }
];

async function runDatabaseTests() {
  console.log(chalk.blue('\nRunning Database Health Checks...\n'));

  try {
    // Test with valid connection
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(chalk.yellow('Connecting to MongoDB...'));
    await client.connect();
    console.log(chalk.green('Successfully connected to MongoDB\n'));

    // Run health checks
    console.log(chalk.yellow('Running Health Checks...'));
    const healthResults = await testDatabaseHealth(client);

    // Print results
    console.log(chalk.cyan('\nDatabase Health Check Results:'));
    console.log(chalk.cyan('Overall Status:'), 
      healthResults.overall_status === 'healthy' 
        ? chalk.green(healthResults.overall_status)
        : chalk.red(healthResults.overall_status)
    );

    healthResults.tests.forEach(test => {
      console.log(
        chalk.cyan(`\n${test.name}:`),
        test.status === 'passed' 
          ? chalk.green(test.status)
          : chalk.red(test.status)
      );
      if (test.message) console.log(chalk.gray(test.message));
      if (test.error) console.log(chalk.red('Error:'), test.error);
    });

    await client.close();
    console.log(chalk.gray('\nDatabase connection closed'));

  } catch (error) {
    console.error(chalk.red('\nDatabase Test Error:'), error.message);
    console.error(chalk.gray(error.stack));
  }

  console.log(chalk.gray('\n' + '='.repeat(80) + '\n'));
}

async function runModerationTests() {
  console.log(chalk.blue('Running Content Moderation Tests...\n'));

  const context = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'test',
    memoryLimitInMB: '128',
    awsRequestId: 'test',
    logGroupName: 'test',
    logStreamName: 'test',
    identity: null,
    clientContext: null,
    getRemainingTimeInMillis: () => 30000
  };

  for (const testCase of moderationTestCases) {
    console.log(chalk.yellow(`\nTesting: ${testCase.name}`));
    console.log(chalk.cyan('Content Type:'), testCase.type);
    console.log(chalk.cyan('Content:'), testCase.type === 'url' ? testCase.url : testCase.content);

    try {
      // Create mock event
      const event = {
        httpMethod: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user-123'
        },
        body: JSON.stringify({
          type: testCase.type,
          content: testCase.type === 'url' ? testCase.url : testCase.content
        })
      };

      // Call appropriate handler
      const response = await (testCase.type === 'url' ? uploadUrlHandler : uploadTextHandler)(event, context);

      console.log(chalk.magenta('\nResponse:'));
      console.log('Status Code:', chalk.cyan(response.statusCode));

      const result = JSON.parse(response.body);

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
      console.error(chalk.red('\nError running test:'), error.message);
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
    }

    // Add a separator between test cases
    console.log(chalk.gray('\n' + '-'.repeat(80)));
  }
}

async function runAllTests() {
  console.log(chalk.blue.bold('Starting System Tests\n'));
  console.log(chalk.gray('='.repeat(80)));

  // Run database tests first
  await runDatabaseTests();

  // Then run moderation tests
  await runModerationTests();

  console.log(chalk.blue.bold('\nSystem Tests Complete'));
}

// Run the tests
runAllTests().catch(error => {
  console.error(chalk.red('\nFatal Error:'), error);
  process.exit(1);
});
