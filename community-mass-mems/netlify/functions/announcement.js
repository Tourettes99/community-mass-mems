const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    try {
        const store = getStore('announcements');

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
            const announcement = await store.get('current');
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
            const body = JSON.parse(event.body);
            await store.set('current', body);
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
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
}
