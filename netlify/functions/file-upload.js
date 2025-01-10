const { Buffer } = require('buffer');
const { extractUrlMetadata, extractFileMetadata } = require('./utils/metadata');
const { getCollection, DB, COLLECTIONS } = require('./utils/db');
const logger = require('./utils/logger');
const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  context.callbackWaitsForEmptyEventLoop = false;

  try {
    logger.info('Request received', {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers
    });

    if (event.httpMethod !== 'POST') {
      logger.warn('Invalid HTTP method', { method: event.httpMethod });
      return {
        statusCode: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
      logger.debug('Parsed request body', {
        type: data.type,
        hasUrl: !!data.url,
        hasContent: !!data.content,
        hasFile: !!data.file,
        fileName: data.fileName
      });
    } catch (error) {
      logger.error('Error parsing request body', error);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    let { type, url, content, tags, file, fileName, contentType } = data;

    if (!type) {
      logger.warn('Missing type field');
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Type field is required' })
      };
    }

    // Initialize memory object
    const memory = {
      type,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      metadata: {
        title: '',
        description: '',
        mediaType: type,
        contentType: contentType || 'text/plain'
      }
    };

    logger.info('Processing content type:', { type });

    try {
      if (type === 'url' || type === 'image' || type === 'video' || type === 'audio') {
        if (!url || !url.trim()) {
          logger.warn('Invalid URL provided', { url });
          return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid URL provided' })
          };
        }

        // Validate URL
        try {
          new URL(url);
        } catch (e) {
          logger.error('Invalid URL format', { url, error: e });
          return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid URL format' })
          };
        }

        memory.url = url;
        
        // Try to fetch the URL first to validate it exists
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
          }
          contentType = response.headers.get('content-type');
        } catch (error) {
          logger.error('Error fetching URL', { url, error: error.message });
          return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: `Failed to fetch URL: ${error.message}` })
          };
        }

        // Extract metadata
        try {
          const urlMetadata = await extractUrlMetadata(url);
          logger.debug('Extracted URL metadata', { metadata: urlMetadata });
          
          memory.metadata = {
            ...memory.metadata,
            ...urlMetadata,
            title: urlMetadata.title || url.split('/').pop(),
            description: urlMetadata.description || 'No description available',
            mediaType: urlMetadata.mediaType || type,
            contentType: urlMetadata.contentType || contentType,
            isPlayable: !!urlMetadata.playbackHtml,
            siteName: urlMetadata.siteName || new URL(url).hostname,
            favicon: `/.netlify/functions/get-favicon?url=${encodeURIComponent(url)}`
          };
        } catch (error) {
          logger.error('Error extracting metadata', { url, error: error.message });
          // Don't fail the upload, just use basic metadata
          memory.metadata = {
            ...memory.metadata,
            title: url.split('/').pop(),
            description: 'No description available',
            mediaType: type,
            contentType: contentType,
            siteName: new URL(url).hostname
          };
        }
      } else if (type === 'text') {
        if (!content) {
          logger.warn('Missing content for text type');
          return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Content is required for text type' })
          };
        }
        logger.info('Processing text content');
        memory.content = content;
        memory.metadata = {
          ...memory.metadata,
          title: content.slice(0, 50),
          description: content,
          mediaType: 'text',
          rawContent: content
        };
      } else if (file) {
        logger.info('Processing file', { fileName });
        try {
          const buffer = Buffer.from(file, 'base64');
          
          // Ensure we have a fileName
          if (!fileName) {
            fileName = 'uploaded-file';
            const ext = contentType ? `.${contentType.split('/')[1]}` : '';
            fileName += ext;
          }
          
          // Store the file content
          memory.file = file;
          memory.fileName = fileName;
          
          try {
            const fileMetadata = await extractFileMetadata(buffer, fileName);
            logger.debug('Extracted file metadata', { metadata: fileMetadata });
            
            memory.metadata = {
              ...memory.metadata,
              ...fileMetadata,
              title: fileName,
              mediaType: type,
              isPlayable: ['video', 'audio'].includes(type),
              fileSize: buffer.length,
              contentType: fileMetadata.contentType || contentType || 'application/octet-stream'
            };
          } catch (fileError) {
            logger.error('File metadata extraction error', fileError, { fileName });
            // Don't fail the upload if metadata extraction fails
            memory.metadata = {
              ...memory.metadata,
              title: fileName,
              description: 'File upload',
              mediaType: type,
              fileSize: buffer.length,
              contentType: contentType || 'application/octet-stream'
            };
          }
        } catch (bufferError) {
          logger.error('Error processing file buffer', bufferError);
          throw new Error('Failed to process file data');
        }
      }

      logger.info('Saving memory to database');
      const collection = await getCollection(DB.MASS_MEMS, COLLECTIONS.MEMORIES);
      const result = await collection.insertOne(memory);
      
      logger.info('Memory saved successfully', { id: result.insertedId });
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          memory: { ...memory, _id: result.insertedId }
        })
      };

    } catch (error) {
      logger.error('Error processing memory', error);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Error processing memory' })
      };
    }
  } catch (error) {
    logger.error('Unexpected error', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'An unexpected error occurred' })
    };
  }
};
