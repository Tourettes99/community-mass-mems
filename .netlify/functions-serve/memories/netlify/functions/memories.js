"use strict";

// netlify/functions/memories.js
var mongoose = require("mongoose");
var MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is missing");
  throw new Error("MONGODB_URI environment variable is required");
}
var memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["image", "gif", "audio", "url"],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    siteName: String,
    description: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
var Memory;
try {
  Memory = mongoose.models.Memory || mongoose.model("Memory", memorySchema);
} catch (e) {
  Memory = mongoose.model("Memory", memorySchema);
}
var isConnected = false;
var connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log("Using existing database connection");
    return;
  }
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log("Connection string format:", MONGODB_URI.split("@")[1]);
    const conn = await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("MongoDB Connected:", conn.connection.host);
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      isConnected = false;
    });
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnected = false;
    });
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    isConnected = false;
    throw error;
  }
};
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers
    };
  }
  try {
    await connectToDatabase();
    if (event.httpMethod === "GET") {
      console.log("Attempting to fetch memories...");
      const memories = await Memory.find({}).sort({ createdAt: -1 }).lean().exec();
      console.log(`Successfully retrieved ${memories.length} memories`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(memories)
      };
    }
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  } catch (error) {
    console.error("Function error:", error);
    console.error("Stack trace:", error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0
      })
    };
  }
};
//# sourceMappingURL=memories.js.map
