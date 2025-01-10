const { getCollection, COLLECTIONS } = require('./utils/db');

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
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
            const collection = await getCollection(COLLECTIONS.ANNOUNCEMENTS);
            
            // Get the most recent active announcement
            const announcement = await collection
                .findOne({ active: true }, { sort: { createdAt: -1 } });

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
            
            const collection = await getCollection(COLLECTIONS.ANNOUNCEMENTS);

            // Create new announcement
            const announcement = {
                message: body.message || '',
                active: body.active || false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Insert the announcement
            await collection.insertOne(announcement);
            console.log('Created new announcement:', announcement);
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
