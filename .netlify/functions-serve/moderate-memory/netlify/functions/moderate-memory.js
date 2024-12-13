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

// netlify/functions/moderate-memory.js
require("dotenv").config();
var mongoose = require("mongoose");
var Memory = require_Memory();
var conn = null;
var connectDb = async () => {
  if (conn == null) {
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5e3
    });
  }
  return conn;
};
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    let memoryId, action, token;
    const contentType = event.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(event.body);
      memoryId = params.get("memoryId");
      action = params.get("action");
      token = params.get("token");
    } else {
      const body = JSON.parse(event.body);
      memoryId = body.memoryId;
      action = body.action;
      token = body.token;
    }
    if (!memoryId || !action || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required parameters",
          received: { memoryId, action, token }
        })
      };
    }
    if (!["approve", "reject"].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid action" })
      };
    }
    const expectedToken = Buffer.from(`${memoryId}:${process.env.EMAIL_USER}`).toString("base64");
    if (token !== expectedToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token" })
      };
    }
    await connectDb();
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Memory not found" })
      };
    }
    memory.status = action === "approve" ? "approved" : "rejected";
    await memory.save();
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*"
        },
        body: `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Moderation Result</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      background-color: #f0f2f5;
                  }
                  .container {
                      text-align: center;
                      padding: 20px;
                      background-color: white;
                      border-radius: 8px;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                      max-width: 500px;
                      width: 90%;
                  }
                  .message {
                      margin: 20px 0;
                      font-size: 18px;
                      color: ${action === "approve" ? "#4CAF50" : "#f44336"};
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="message">
                      Memory successfully ${action}ed!
                  </div>
              </div>
          </body>
          </html>
        `
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Memory ${action}ed successfully`,
        status: memory.status
      })
    };
  } catch (error) {
    console.error("Error in moderation:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", details: error.message })
    };
  }
};
//# sourceMappingURL=moderate-memory.js.map
