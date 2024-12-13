"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// netlify/functions/models/Memory.js
var require_Memory = __commonJS({
  "netlify/functions/models/Memory.js"(exports2, module2) {
    "use strict";
    var mongoose2 = require("mongoose");
    var memorySchema = new mongoose2.Schema({
      type: {
        type: String,
        required: true,
        enum: ["url", "text", "image", "video", "audio", "document"]
      },
      url: {
        type: String,
        required: function() {
          return this.type === "url" || this.type === "image" || this.type === "video" || this.type === "audio" || this.type === "document";
        }
      },
      content: {
        type: String,
        required: function() {
          return this.type === "text";
        }
      },
      tags: {
        type: [String],
        default: []
      },
      status: {
        type: String,
        required: true,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
      },
      submittedAt: {
        type: Date,
        required: true,
        default: Date.now
      },
      metadata: {
        title: String,
        description: String,
        thumbnailUrl: String,
        mediaType: String,
        platform: String,
        contentUrl: String,
        fileType: String,
        domain: String,
        isSecure: Boolean,
        createdAt: {
          type: Date,
          default: Date.now
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        favicon: String,
        ogTitle: String,
        ogDescription: String,
        ogImage: String,
        ogType: String,
        twitterTitle: String,
        twitterDescription: String,
        twitterImage: String,
        twitterCard: String
      },
      votes: {
        up: {
          type: Number,
          default: 0
        },
        down: {
          type: Number,
          default: 0
        }
      },
      userVotes: {
        type: Map,
        of: String,
        default: /* @__PURE__ */ new Map()
      }
    }, {
      timestamps: true,
      toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
          if (ret.metadata) {
            ret.metadata.createdAt = ret.metadata.createdAt ? new Date(ret.metadata.createdAt).toISOString() : null;
            ret.metadata.updatedAt = ret.metadata.updatedAt ? new Date(ret.metadata.updatedAt).toISOString() : null;
          }
          ret.id = ret._id.toString();
          delete ret._id;
          delete ret.__v;
          if (ret.userVotes instanceof Map) {
            ret.userVotes = Object.fromEntries(ret.userVotes);
          }
          return ret;
        }
      },
      toObject: {
        virtuals: true,
        transform: function(doc, ret) {
          ret.id = ret._id.toString();
          if (!(ret.userVotes instanceof Map)) {
            ret.userVotes = new Map(Object.entries(ret.userVotes || {}));
          }
          return ret;
        }
      }
    });
    memorySchema.pre("save", function(next) {
      if (this.isModified()) {
        const now = /* @__PURE__ */ new Date();
        if (!this.metadata) {
          this.metadata = {};
        }
        if (this.isNew) {
          this.metadata.createdAt = now;
        }
        this.metadata.updatedAt = now;
      }
      next();
    });
    var Memory2 = mongoose2.model("Memory", memorySchema);
    module2.exports = Memory2;
  }
});

// netlify/functions/getMemories.js
require("dotenv").config();
var mongoose = require("mongoose");
var Memory = require_Memory();
var conn = null;
var connectDb = async () => {
  if (conn == null) {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    try {
      conn = await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 45e3,
        connectTimeoutMS: 1e4,
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log("Successfully connected to MongoDB memories database");
    } catch (err) {
      console.error("MongoDB connection error:", err);
      throw err;
    }
  }
  return conn;
};
var formatDate = (date) => {
  if (!date)
    return null;
  try {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return null;
  }
};
var formatMemory = (memory) => {
  if (!memory)
    return null;
  try {
    const formatted = {
      ...memory,
      submittedAt: formatDate(memory.submittedAt),
      metadata: {
        ...memory.metadata,
        createdAt: formatDate(memory.submittedAt),
        updatedAt: formatDate(memory.updatedAt)
      },
      votes: {
        up: memory.votes?.up || 0,
        down: memory.votes?.down || 0
      }
    };
    delete formatted.__v;
    return formatted;
  } catch (error) {
    console.error("Error formatting memory:", error);
    return null;
  }
};
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...headers, "Allow": "GET" },
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }
  try {
    await connectDb();
    console.log("Connected to database, fetching memories...");
    let memories;
    try {
      memories = await Memory.find({ status: "approved" }).sort({ submittedAt: -1 }).lean().exec();
      memories = memories.map(formatMemory).filter(Boolean);
      console.log(`Successfully fetched ${memories.length} approved memories`);
    } catch (dbError) {
      console.error("Database query error:", dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }
    if (!Array.isArray(memories)) {
      console.error("Invalid memories format:", memories);
      throw new Error("Invalid data format returned from database");
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(memories)
    };
  } catch (error) {
    console.error("Error in getMemories function:", error);
    const isConnectionError = error.name === "MongooseError" || error.name === "MongoError" || error.message.includes("connect");
    const statusCode = isConnectionError ? 503 : 500;
    const message = isConnectionError ? "Database connection error. Please try again later." : "Internal server error while fetching memories.";
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        message,
        error: process.env.NODE_ENV === "development" ? error.message : void 0
      })
    };
  }
};
//# sourceMappingURL=getMemories.js.map
