"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// netlify/functions/utils/db.js
var require_db = __commonJS({
  "netlify/functions/utils/db.js"(exports2, module2) {
    "use strict";
    var mongoose = require("mongoose");
    var cachedDb = null;
    async function connectToDatabase2() {
      if (cachedDb) {
        return cachedDb;
      }
      try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        cachedDb = connection;
        return cachedDb;
      } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
      }
    }
    module2.exports = { connectToDatabase: connectToDatabase2 };
  }
});

// netlify/functions/models/Memory.js
var require_Memory = __commonJS({
  "netlify/functions/models/Memory.js"(exports2, module2) {
    "use strict";
    var mongoose = require("mongoose");
    var memorySchema = new mongoose.Schema({
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
    var Memory2 = mongoose.model("Memory", memorySchema);
    module2.exports = Memory2;
  }
});

// netlify/functions/get-weekly-stats.js
var { connectToDatabase } = require_db();
var Memory = require_Memory();
exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    await connectToDatabase();
    const now = /* @__PURE__ */ new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const nextReset = new Date(startOfWeek);
    nextReset.setDate(nextReset.getDate() + 7);
    const postsThisWeek = await Memory.countDocuments({
      submittedAt: { $gte: startOfWeek.toISOString() },
      status: "approved"
      // Only count approved posts
    });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        postsThisWeek,
        weeklyLimit: 35,
        nextReset: nextReset.toISOString()
      })
    };
  } catch (error) {
    console.error("Error getting weekly stats:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to get weekly stats" })
    };
  }
};
//# sourceMappingURL=get-weekly-stats.js.map
