const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    console.log('Function invoked with method:', event.httpMethod);
    try {
        const store = getStore('announcements');
        console.log('Store initialized');

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

        if (event.httpMethod === 'GET') {
            console.log('Processing GET request');
            const announcement = await store.get('current');
            console.log('Retrieved announcement:', announcement);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(announcement || { message: '', active: false })
            };
        }

        if (event.httpMethod === 'POST') {
            console.log('Processing POST request');
            const body = JSON.parse(event.body);
            console.log('Parsed body:', body);
            await store.set('current', body);
            console.log('Announcement stored successfully');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: true })
            };
        }

        console.log('Method not allowed:', event.httpMethod);
        return {
            statusCode: 405,
            body: 'Method not allowed'
        };
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            event: event
        });
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message,
                stack: error.stack
            })
        };
    }
}
