require('dotenv').config();
const { getCollection, DB, COLLECTIONS } = require('./utils/db');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const { getUrlMetadata } = require('./utils/urlMetadata');
const groqModeration = require('./services/groqModeration');
const fileStorage = require('./services/fileStorage');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Debug logging
    console.log('Request method:', event.httpMethod);
    console.log('Request headers:', event.headers);
    console.log('Request body:', event.body);

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
        const urlMetadata = await getUrlMetadata(url.trim());
        
        // Ensure all required metadata fields exist
        metadata = {
          title: urlMetadata.title || url,
          description: urlMetadata.description || '',
          mediaType: urlMetadata.mediaType || 'rich',
          thumbnailUrl: urlMetadata.thumbnailUrl || urlMetadata.previewUrl || urlMetadata.ogImage || '',
          platform: urlMetadata.platform || new URL(url).hostname,
          contentUrl: url,
          fileType: urlMetadata.fileType || '',
          domain: new URL(url).hostname,
          isSecure: url.startsWith('https'),
          siteName: urlMetadata.siteName || new URL(url).hostname,
          embedHtml: urlMetadata.embedHtml || '',
          dimensions: urlMetadata.dimensions || { width: 560, height: 315 },
          ogImage: urlMetadata.ogImage,
          previewUrl: urlMetadata.previewUrl,
          publishedDate: urlMetadata.publishedDate,
          author: urlMetadata.author
        };
      } catch (error) {
        console.error('Error fetching metadata:', error);
        // Use basic metadata if fetch fails
        metadata = {
          title: url,
          description: '',
          mediaType: 'rich',
          platform: new URL(url).hostname,
          contentUrl: url,
          domain: new URL(url).hostname,
          isSecure: url.startsWith('https')
        };
      }
    } else {
      metadata = {
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        description: content,
        mediaType: 'text',
        format: 'text/plain'
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
        metadata.isDiscordCdn = true;
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

    try {
      const collection = await getCollection(DB.MASS_MEMS, COLLECTIONS.MEMORIES);

      // Create new memory document
      const memory = {
        _id: new ObjectId(),
        type,
        url: type === 'url' ? url.trim() : undefined,
        content: type === 'text' ? content.trim() : undefined,
        tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
        status: process.env.GROQ_API_KEY ? 'pending' : 'approved',
        metadata,
        submittedAt: new Date().toISOString(),
        votes: { up: 0, down: 0 },
        userVotes: new Map()
      };

      // Perform moderation if GROQ_API_KEY is set
      if (process.env.GROQ_API_KEY) {
        const moderationResult = await groqModeration.moderateContent(
          type === 'url' ? `${url}\n${metadata.title || ''}\n${metadata.description || ''}` : content,
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
      
      // Determine if it's a connection error
      const isConnectionError = error.message.includes('connect') || 
                              error.message.includes('timeout') ||
                              error.message.includes('network');
      
      const statusCode = isConnectionError ? 503 : 500;
      const message = isConnectionError 
        ? 'Database connection error. Please try again later.'
        : 'Internal server error while saving memory.';

      return {
        statusCode,
        headers,
        body: JSON.stringify({
          error: message,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      };
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
  }
};
