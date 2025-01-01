const oneDriveStorage = require('./oneDriveStorage');

class FileStorageService {
  constructor() {
    this.storage = oneDriveStorage;
  }

  async initialize() {
    try {
      await this.storage.initialize();
      console.log('Successfully initialized file storage service');
    } catch (error) {
      console.error('Error initializing file storage:', error);
      throw error;
    }
  }

  async storeFileFromUrl(url, metadata = {}) {
    try {
      return await this.storage.storeFileFromUrl(url, metadata);
    } catch (error) {
      console.error('Error storing file:', error);
      throw error;
    }
  }

  async getFileById(fileId) {
    try {
      return await this.storage.getFileById(fileId);
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async getFileUrl(fileId) {
    try {
      return await this.storage.getFileUrl(fileId);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  }

  async getFile(fileId) {
    try {
      return await this.storage.getFileById(fileId);
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.storage.cleanup();
    } catch (error) {
      console.error('Error cleaning up file storage:', error);
    }
  }
}

module.exports = new FileStorageService();
