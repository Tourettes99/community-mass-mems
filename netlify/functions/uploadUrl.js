require('dotenv').config();
const { getCollection, COLLECTIONS } = require('./utils/db');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');
const { getUrlMetadata } = require('./utils/urlMetadata');
const openaiModeration = require('./services/openaiModeration');
const fileStorage = require('./services/fileStorage');
const { createErrorResponse, logError } = require('./utils/errors');
const { createModerationError, logModerationDecision } = require('./utils/moderationErrors');

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
      return createErrorResponse('INVALID_REQUEST_BODY', 'Only POST method is allowed', 405);
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      logError('INVALID_REQUEST_BODY', error, { body: event.body });
      return createErrorResponse('INVALID_REQUEST_BODY', 'Failed to parse JSON body');
    }

    const { type, tags } = body;
    let { url, content } = body;
    
    // Check if we have either URL or content
    if (type === 'url' && !url) {
      return createErrorResponse('MISSING_URL');
    }
    if (type === 'text' && !content) {
      return createErrorResponse('MISSING_CONTENT');
    }

    // Get metadata based on type
    let metadata = {};
    if (type === 'url') {
      try {
        // Validate URL format
        const urlObj = new URL(url.trim());
        if (!urlObj.protocol.startsWith('http')) {
          return createErrorResponse('INVALID_URL_PROTOCOL');
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
        logError('METADATA_FETCH_ERROR', error, { url });
        return createErrorResponse('METADATA_FETCH_ERROR', error.message);
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
        logError('DISCORD_CDN_ERROR', error, { url });
        return createErrorResponse('DISCORD_CDN_ERROR', error.message);
      }
    }

    try {
      const collection = await getCollection(COLLECTIONS.MEMORIES);
      const requestId = Math.random().toString(36).substring(2, 15);

      // Create new memory document
      const memory = {
        _id: new ObjectId(),
        type,
        url: type === 'url' ? url.trim() : undefined,
        content: type === 'text' ? content.trim() : undefined,
        tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
        status: 'pending', // Default to pending until moderation
        metadata,
        submittedAt: new Date().toISOString(),
        votes: { up: 0, down: 0 },
        userVotes: new Map(),
        requestId
      };

      // Perform content moderation
      try {
        const moderationResult = await openaiModeration.moderateContent(
          type === 'url' ? `${url}\n${metadata.title || ''}\n${metadata.description || ''}` : content,
          type
        );

        // Log moderation decision
        logModerationDecision(
          type === 'url' ? url : content,
          moderationResult,
          {
            type,
            requestId,
            userId: event.headers['x-user-id'],
            metadata: {
              title: metadata.title,
              domain: metadata.domain
            }
          }
        );

        // Update memory with moderation result
        memory.status = moderationResult.flagged ? 'rejected' : 'approved';
        memory.moderationResult = {
          flagged: moderationResult.flagged,
          categories: moderationResult.categories,
          category_scores: moderationResult.category_scores,
          reason: moderationResult.reason
        };

        if (moderationResult.flagged) {
          // Create user-friendly moderation error response
          const moderationError = createModerationError(
            moderationResult.categories,
            moderationResult.category_scores
          );

          // Save to database for audit
          await collection.insertOne(memory);

          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: moderationError,
              id: memory._id,
              requestId
            })
          };
        }
      } catch (error) {
        logError('MODERATION_FAILED', error, { type, content: type === 'url' ? url : content });
        // Set status to pending if moderation fails
        memory.status = 'pending';
        memory.moderationResult = {
          error: 'Moderation service unavailable',
          timestamp: new Date().toISOString()
        };
      }

      // Save to database
      try {
        await collection.insertOne(memory);
      } catch (error) {
        logError('DB_WRITE_ERROR', error, { memoryId: memory._id });
        return createErrorResponse('DB_WRITE_ERROR', error.message, 500);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Memory submitted successfully',
          id: memory._id,
          metadata: metadata,
          status: memory.status,
          requestId
        })
      };
    } catch (error) {
      logError('DB_CONNECTION_ERROR', error);
      return createErrorResponse('DB_CONNECTION_ERROR', error.message, 503);
    }
  } catch (error) {
    logError('INTERNAL_ERROR', error);
    return createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
};
