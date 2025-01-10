require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const { getUrlMetadata } = require('./utils/urlMetadata');
const groqModeration = require('./services/groqModeration');
const fileStorage = require('./services/fileStorage');

// Initialize services
let servicesInitialized = false;
async function initializeServices() {
  if (!servicesInitialized) {
    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not set, content moderation will be skipped');
    } else {
      await groqModeration.initialize();
    }
    await fileStorage.initialize();
    servicesInitialized = true;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let client;

  try {
    // Debug logging
    console.log('Request method:', event.httpMethod);
    console.log('Request headers:', event.headers);
    console.log('Request body:', event.body);

    // Initialize services first
    try {
      await initializeServices();
    } catch (error) {
      console.error('Error initializing services:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Failed to initialize services',
          details: error.message 
        })
      };
    }

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    const { type, tags } = body;
    let { url, content } = body;
    
    // Check if we have either URL or content
    if (type === 'url' && !url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required for URL type' })
      };
    }
    if (type === 'text' && !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required for text type' })
      };
    }

    // Get metadata based on type
    let metadata = {};
    if (type === 'url') {
      try {
        // Validate URL format
        const urlObj = new URL(url.trim());
        if (!urlObj.protocol.startsWith('http')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid URL protocol. Only HTTP(S) URLs are allowed.' })
          };
        }

        console.log('Fetching metadata for URL:', url);
        metadata = await getUrlMetadata(url.trim());
        
        // Only perform moderation if GROQ_API_KEY is set
        if (process.env.GROQ_API_KEY) {
          const urlModeration = await groqModeration.moderateContent(url, 'url');
          const contentModeration = await groqModeration.moderateContent(
            `Title: ${metadata.basicInfo?.title || ''}\nDescription: ${metadata.basicInfo?.description || ''}`,
            'text'
          );

          // Check moderation results
          if (urlModeration.flagged || contentModeration.flagged) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error: 'Content moderation failed',
                reason: urlModeration.flagged ? urlModeration.reason : contentModeration.reason,
                scores: {
                  url: urlModeration.category_scores,
                  content: contentModeration.category_scores
                }
              })
            };
          }
        }

        // Check if the URL is accessible
        if (metadata.error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'URL validation failed',
              details: metadata.error,
              isExpired: metadata.isExpired
            })
          };
        }

        // Ensure all required metadata fields exist
        metadata = {
          basicInfo: {
            title: metadata.title || url,
            description: metadata.description || '',
            mediaType: metadata.mediaType || 'rich',
            thumbnailUrl: metadata.thumbnailUrl || metadata.previewUrl || metadata.ogImage || '',
            platform: metadata.platform || new URL(url).hostname,
            contentUrl: url,
            fileType: metadata.fileType || '',
            domain: new URL(url).hostname,
            isSecure: url.startsWith('https')
          },
          embed: {
            embedUrl: metadata.embedUrl || '',
            embedHtml: metadata.embedHtml || '',
            embedType: metadata.embedType || ''
          },
          timestamps: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        console.error('Error fetching metadata:', error);
        // Use basic metadata if fetch fails
        metadata = {
          basicInfo: {
            title: url,
            description: '',
            mediaType: 'rich',
            platform: new URL(url).hostname,
            contentUrl: url,
            domain: new URL(url).hostname,
            isSecure: url.startsWith('https')
          },
          timestamps: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
      }
    } else {
      metadata = {
        basicInfo: {
          type: 'text',
          format: 'text/plain',
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          description: content,
          mediaType: 'text'
        },
        timestamps: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    }

    // Process Discord CDN URLs
    if (url && url.includes('cdn.discordapp.com')) {
      try {
        console.log('Processing Discord CDN URL:', url);
        const storedFile = await fileStorage.storeFileFromUrl(url);
        console.log('File stored successfully:', storedFile);
        
        // Replace the Discord URL with our permanent URL
        const permanentUrl = await fileStorage.getFileUrl(storedFile.fileId);
        console.log('Generated permanent URL:', permanentUrl);
        url = permanentUrl;
      } catch (error) {
        console.error('Error processing Discord CDN URL:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to process Discord CDN URL',
            details: error.message 
          })
        };
      }
    }

    // Connect to MongoDB with increased timeouts
    try {
      client = await MongoClient.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 75000,
        connectTimeoutMS: 30000,
        family: 4
      });

      const db = client.db('mass-mems');
      const collection = db.collection('memories');

      // Create new memory document
      const memory = {
        _id: new ObjectId(),
        type: type,
        url: type === 'url' ? url.trim() : undefined,
        content: type === 'text' ? content.trim() : undefined,
        tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
        status: process.env.GROQ_API_KEY ? 'pending' : 'approved', // Auto-approve if no moderation
        metadata: metadata,
        votes: { up: 0, down: 0 },
        userVotes: {},
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Perform moderation if GROQ_API_KEY is set
      if (process.env.GROQ_API_KEY) {
        const moderationResult = await groqModeration.moderateContent(
          type === 'url' ? `${url}\n${metadata.basicInfo?.title || ''}\n${metadata.basicInfo?.description || ''}` : content,
          type
        );

        // Update memory with moderation result
        memory.status = moderationResult.flagged ? 'rejected' : 'approved';
        memory.moderationResult = {
          flagged: moderationResult.flagged,
          category_scores: moderationResult.category_scores,
          reason: moderationResult.reason
        };

        if (moderationResult.flagged) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              message: 'Content rejected by moderation',
              reason: moderationResult.reason,
              category_scores: moderationResult.category_scores,
              id: memory._id
            })
          };
        }
      }

      // Save to database
      await collection.insertOne(memory);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Memory submitted successfully',
          id: memory._id,
          metadata: metadata
        })
      };
    } catch (error) {
      console.error('Error:', error);
      console.error('Error stack:', error.stack);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
      };
    } finally {
      if (client) {
        await client.close();
      }
    }
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  } finally {
    // Clean up resources
    try {
      await fileStorage.cleanup();
    } catch (error) {
      console.error('Error cleaning up file storage:', error);
    }
    if (client) {
      await client.close();
    }
  }
};
