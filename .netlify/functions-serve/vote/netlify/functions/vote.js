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

// netlify/functions/vote.js
require("dotenv").config();
var mongoose = require("mongoose");
var Memory = require_Memory();
var conn = null;
var connectDb = async () => {
  if (conn == null) {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5e3
    });
  }
  return conn;
};
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, "Allow": "POST" },
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }
  try {
    const { memoryId, voteType, userId } = JSON.parse(event.body);
    if (!memoryId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Memory ID and User ID are required" })
      };
    }
    if (!["up", "down"].includes(voteType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Vote type must be either "up" or "down"' })
      };
    }
    await connectDb();
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Memory not found" })
      };
    }
    const currentVote = memory.userVotes.get(userId);
    let updateQuery = {};
    if (!currentVote) {
      updateQuery = {
        $inc: { [`votes.${voteType}`]: 1 },
        $set: { [`userVotes.${userId}`]: voteType }
      };
    } else if (currentVote === voteType) {
      updateQuery = {
        $inc: { [`votes.${voteType}`]: -1 },
        $unset: { [`userVotes.${userId}`]: "" }
      };
    } else {
      updateQuery = {
        $inc: {
          [`votes.${currentVote}`]: -1,
          [`votes.${voteType}`]: 1
        },
        $set: { [`userVotes.${userId}`]: voteType }
      };
    }
    const updatedMemory = await Memory.findByIdAndUpdate(
      memoryId,
      updateQuery,
      {
        new: true,
        runValidators: true
      }
    );
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Vote recorded successfully",
        votes: updatedMemory.votes,
        userVote: updatedMemory.userVotes.get(userId) || null
      })
    };
  } catch (error) {
    console.error("Error in vote function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal server error while recording vote",
        error: process.env.NODE_ENV === "development" ? error.message : void 0
      })
    };
  }
};
//# sourceMappingURL=vote.js.map
