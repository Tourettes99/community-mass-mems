# Netlify Serverless Functions

This directory contains the serverless functions that replace the Express server. The functions are:

1. `getMemories.js` - Handles GET requests to fetch all memories
2. `upload.js` - Handles POST requests for file uploads (stores files as base64 data URLs)
3. `uploadUrl.js` - Handles POST requests for URL uploads

## Environment Variables Required

Make sure to set these environment variables in your Netlify dashboard:

- `MONGODB_URI` - MongoDB connection string

## Changes from Express Server

1. File uploads now store files as base64 data URLs in MongoDB
2. Each route is now a separate function
3. Database connections are optimized for serverless environment
4. CORS headers are included in each function response
5. Error handling is adapted for serverless context

## Note on File Storage

Files are stored as base64 data URLs directly in MongoDB. This approach is simple but has limitations:
- Maximum file size is limited by MongoDB document size (16MB)
- Larger files will increase database size and query times
- Best suited for small images and files

For production with larger files, consider using a dedicated storage service like AWS S3 or Netlify's Large Media.
