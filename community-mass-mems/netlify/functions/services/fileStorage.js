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
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        
        const db = this.client.db('community-mass-mems');
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
          filename: existingFile[0].filename
        };
      }

      console.log('Downloading file from:', url);
      // Download the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from ${url}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const filename = `${Date.now()}-${url.split('/').pop()}`;

      console.log('Creating readable stream from buffer');
      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      console.log('Storing file in GridFS');
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
          .on('error', (error) => {
            console.error('Error during file upload:', error);
            reject(error);
          })
          .on('finish', () => {
            console.log('File upload completed');
            resolve();
          });
      });

      console.log('File stored successfully');
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
