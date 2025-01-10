require('dotenv').config();
const groqModeration = require('../netlify/functions/services/groqModeration');
const openaiModeration = require('../netlify/functions/services/openaiModeration');
const chalk = require('chalk');

async function testModeration() {
    console.log(chalk.blue('Testing moderation services...\n'));

    const testCases = [
        {
            name: 'Safe URL',
            type: 'url',
            content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        },
        {
            name: 'Safe Text',
            type: 'text',
            content: 'This is a test memory about my favorite game.'
        },
        {
            name: 'Potentially Unsafe Text',
            type: 'text',
            content: 'I hate this game so much, it makes me want to throw my controller!'
        },
        {
            name: 'Definitely Unsafe Text',
            type: 'text',
            content: 'This is some very inappropriate content that should definitely be flagged [EXPLICIT CONTENT REMOVED]'
        }
    ];

    for (const testCase of testCases) {
        console.log(chalk.yellow(`\nTesting: ${testCase.name}`));
        console.log(chalk.cyan('Content:'), testCase.content);

        try {
            // Test Groq moderation
            console.log(chalk.magenta('\nGroq Moderation:'));
            const groqStart = Date.now();
            const groqResult = await groqModeration.moderateContent(testCase.content, testCase.type);
            const groqTime = Date.now() - groqStart;
            console.log('Time:', chalk.cyan(`${groqTime}ms`));
            console.log('Flagged:', chalk.cyan(groqResult.flagged));
            if (groqResult.flagged) {
                console.log('Reason:', chalk.red(groqResult.reason));
            }

            // Test OpenAI moderation
            console.log(chalk.magenta('\nOpenAI Moderation:'));
            const openaiStart = Date.now();
            const openaiResult = await openaiModeration.moderateContent(testCase.content, testCase.type);
            const openaiTime = Date.now() - openaiStart;
            console.log('Time:', chalk.cyan(`${openaiTime}ms`));
            console.log('Flagged:', chalk.cyan(openaiResult.flagged));
            if (openaiResult.flagged) {
                console.log('Categories:', chalk.red(Object.entries(openaiResult.categories)
                    .filter(([_, flagged]) => flagged)
                    .map(([category]) => category)
                    .join(', ')));
                console.log('Reason:', chalk.red(openaiResult.reason));
            }

            // Compare results
            console.log(chalk.magenta('\nComparison:'));
            console.log('Agreement:', chalk.cyan(groqResult.flagged === openaiResult.flagged));
            console.log('Speed Difference:', chalk.cyan(`${Math.abs(groqTime - openaiTime)}ms`));
            console.log('Faster Service:', chalk.cyan(groqTime < openaiTime ? 'Groq' : 'OpenAI'));

        } catch (error) {
            console.error(chalk.red(`Error testing ${testCase.name}:`), error);
        }

        // Add a separator between test cases
        console.log(chalk.gray('\n' + '-'.repeat(80)));
    }
}

// Run the tests
testModeration().catch(console.error);
