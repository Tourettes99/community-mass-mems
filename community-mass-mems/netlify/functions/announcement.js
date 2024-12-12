const fs = require('fs').promises;
const path = require('path');

const ANNOUNCEMENT_FILE = path.join('/tmp', 'announcement.json');

async function initializeAnnouncementFile() {
    try {
        await fs.access(ANNOUNCEMENT_FILE);
    } catch {
        const defaultData = { message: '', active: false };
        await fs.writeFile(ANNOUNCEMENT_FILE, JSON.stringify(defaultData));
    }
}

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                }
            };
        }

        await initializeAnnouncementFile();

        if (event.httpMethod === 'GET') {
            const data = await fs.readFile(ANNOUNCEMENT_FILE, 'utf8');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: data
            };
        }

        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            await fs.writeFile(ANNOUNCEMENT_FILE, JSON.stringify(body));
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: true })
            };
        }

        return {
            statusCode: 405,
            body: 'Method not allowed'
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}
