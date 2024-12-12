const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

class FileStorageService {
  constructor() {
    this.client = null;
    this.bucket = null;
  }

  async initialize() {
    if (!this.client) {
      this.client = await MongoClient.connect(process.env.MONGODB_URI);
      const db = this.client.db('community-mass-mems');
      this.bucket = new GridFSBucket(db, {
        bucketName: 'media'
      });
    }
  }

  async storeFileFromUrl(url, metadata = {}) {
    try {
      await this.initialize();

      // Check if we already have this file stored
      const existingFile = await this.bucket.find({ 
        'metadata.originalUrl': url 
      }).toArray();
      
      if (existingFile.length > 0) {
        return {
          fileId: existingFile[0]._id,
          filename: existingFile[0].filename
        };
      }

      // Download the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from ${url}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const filename = `${Date.now()}-${url.split('/').pop()}`;

      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // Store in GridFS
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: {
          ...metadata,
          originalUrl: url,
          uploadDate: new Date(),
          source: 'discord'
        }
      });

      await new Promise((resolve, reject) => {
        stream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });

      return {
        fileId: uploadStream.id,
        filename: filename
      };
    } catch (error) {
      console.error('Error storing file:', error);
      throw error;
    }
  }

  async getFileUrl(fileId) {
    // Generate a permanent URL for the file
    // This will be served through your Netlify function
    return `/.netlify/functions/serveMedia?id=${fileId}`;
  }

  async getFile(fileId) {
    await this.initialize();
    return this.bucket.openDownloadStream(fileId);
  }
}

module.exports = new FileStorageService();
