import { MongoClient } = require("mongodb");

// Create a new MongoClient
const mongoClient = new MongoClient(process.env.MONGODB_URI);
const clientPromise = mongoClient.connect();

export const handler = async (event, context) => {
    try {
        // Get database connection
        const database = (await clientPromise).db(process.env.MONGODB_DATABASE);
        const collection = database.collection("mems");

        // Get all mems documents
        const results = await collection.find({}).toArray();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                // Add CORS headers
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            },
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
}
