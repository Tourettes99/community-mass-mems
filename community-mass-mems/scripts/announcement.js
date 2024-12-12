const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const API_URL = 'https://community-mass-mems.netlify.app/api/announcement';

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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, active: true })
        });
        
        if (!response.ok) throw new Error('Failed to post announcement');
        console.log('Announcement posted successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function stopAnnouncement() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '', active: false })
        });
        
        if (!response.ok) throw new Error('Failed to stop announcement');
        console.log('Announcement stopped successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

if (argv._[0] === 'post' && argv.message) {
    postAnnouncement(argv.message);
} else if (argv._[0] === 'stop') {
    stopAnnouncement();
}
