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
    try {
      if (!this.client) {
        this.client = await MongoClient.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 75000,
          connectTimeoutMS: 30000,
          maxPoolSize: 10,
          minPoolSize: 5
        });
        
        const db = this.client.db('memories'); 
        this.bucket = new GridFSBucket(db, {
          bucketName: 'media'
        });
        
        console.log('Successfully connected to MongoDB for file storage');
      }
    } catch (error) {
      console.error('Error initializing file storage:', error);
      // Close the client if connection failed
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      throw error;
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
        console.log('File already exists in storage, returning existing ID');
        return {
          fileId: existingFile[0]._id,
          isExisting: true
        };
      }

      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const stream = Readable.from(buffer);

      // Store the file
      const uploadStream = this.bucket.openUploadStream(url, {
        metadata: {
          ...metadata,
          originalUrl: url,
          uploadedAt: new Date()
        }
      });

      await new Promise((resolve, reject) => {
        stream.pipe(uploadStream)
          .on('error', reject)
          .on('finish', resolve);
      });

      console.log('File stored successfully');
      return {
        fileId: uploadStream.id,
        isExisting: false
      };
    } catch (error) {
      console.error('Error storing file:', error);
      throw error;
    }
  }

  async getFileById(fileId) {
    try {
      await this.initialize();
      return this.bucket.openDownloadStream(fileId);
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async getFileUrl(fileId) {
    // Generate a permanent URL for the file
    return `/.netlify/functions/serveMedia?id=${fileId}`;
  }

  async getFile(fileId) {
    try {
      await this.initialize();
      return this.bucket.openDownloadStream(fileId);
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.bucket = null;
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
      }
    }
  }
}

module.exports = new FileStorageService();
