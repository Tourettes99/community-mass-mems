const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const API_URL = 'https://community-mass-mems.netlify.app/api/announcement';  // Updated to use the API redirect

const argv = yargs(hideBin(process.argv))
    .command('post <message>', 'Post a new announcement', (yargs) => {
        yargs.positional('message', {
            describe: 'The announcement message to display',
            type: 'string'
        });
    })
    .command('stop', 'Stop displaying the current announcement')
    .demandCommand(1)
    .help()
    .argv;

async function postAnnouncement(message) {
    try {
        console.log('Posting announcement...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, active: true })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            console.log('Announcement posted successfully!');
        } else {
            throw new Error('Failed to post announcement');
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

async function stopAnnouncement() {
    try {
        console.log('Stopping announcement...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '', active: false })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            console.log('Announcement stopped successfully!');
        } else {
            throw new Error('Failed to stop announcement');
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (argv._[0] === 'post' && argv.message) {
    postAnnouncement(argv.message);
} else if (argv._[0] === 'stop') {
    stopAnnouncement();
}
