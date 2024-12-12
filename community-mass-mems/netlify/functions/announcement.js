// In-memory storage for development
let currentAnnouncement = { message: '', active: false };

exports.handler = async (event, context) => {
    console.log('Function invoked with method:', event.httpMethod);
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

        if (event.httpMethod === 'GET') {
            console.log('Processing GET request');
            console.log('Current announcement:', currentAnnouncement);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(currentAnnouncement)
            };
        }

        if (event.httpMethod === 'POST') {
            console.log('Processing POST request');
            const body = JSON.parse(event.body);
            console.log('Parsed body:', body);
            
            // Update the announcement
            currentAnnouncement = {
                message: body.message || '',
                active: body.active || false
            };
            
            console.log('Updated announcement:', currentAnnouncement);
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
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            event: event
        });
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message,
                stack: error.stack
            })
        };
    }
}
