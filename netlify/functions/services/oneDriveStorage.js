const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const { ClientSecretCredential } = require('@azure/identity');
const fetch = require('node-fetch');
const { Readable } = require('stream');

class OneDriveStorageService {
  constructor() {
    this.client = null;
    this.driveId = process.env.ONEDRIVE_DRIVE_ID;
    this.folderId = process.env.ONEDRIVE_FOLDER_ID;
  }

  async initialize() {
    try {
      if (!this.client) {
        const credential = new ClientSecretCredential(
          process.env.AZURE_TENANT_ID,
          process.env.AZURE_CLIENT_ID,
          process.env.AZURE_CLIENT_SECRET
        );

        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
          scopes: ['https://graph.microsoft.com/.default']
        });

        this.client = Client.initWithMiddleware({
          authProvider,
          fetchOptions: {
            timeout: 30000
          }
        });

        console.log('Successfully initialized OneDrive storage service');
      }
    } catch (error) {
      console.error('Error initializing OneDrive storage:', error);
      throw error;
    }
  }

  async storeFileFromUrl(url, metadata = {}) {
    try {
      await this.initialize();

      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const fileName = url.split('/').pop() || 'file';

      // Upload to OneDrive
      const uploadSession = await this.client.api(`/drives/${this.driveId}/items/${this.folderId}:/${fileName}:/createUploadSession`)
        .post({
          item: {
            "@microsoft.graph.conflictBehavior": "rename"
          }
        });

      const maxChunkSize = 320 * 1024; // 320 KB chunks
      const fileSize = buffer.length;
      const chunks = Math.ceil(fileSize / maxChunkSize);

      let uploadedFile;
      for (let i = 0; i < chunks; i++) {
        const start = i * maxChunkSize;
        const end = Math.min(fileSize, (i + 1) * maxChunkSize);
        const chunkBuffer = buffer.slice(start, end);

        uploadedFile = await this.client.api(uploadSession.uploadUrl)
          .headers({
            'Content-Length': end - start,
            'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`
          })
          .put(chunkBuffer);
      }

      console.log('File stored successfully in OneDrive');
      return {
        fileId: uploadedFile.id,
        isExisting: false
      };
    } catch (error) {
      console.error('Error storing file in OneDrive:', error);
      throw error;
    }
  }

  async getFileById(fileId) {
    try {
      await this.initialize();
      const file = await this.client.api(`/drives/${this.driveId}/items/${fileId}`)
        .select('id,name,webUrl,@microsoft.graph.downloadUrl')
        .get();
      
      const response = await fetch(file['@microsoft.graph.downloadUrl']);
      if (!response.ok) {
        throw new Error('Failed to download file from OneDrive');
      }

      const buffer = await response.buffer();
      return Readable.from(buffer);
    } catch (error) {
      console.error('Error getting file from OneDrive:', error);
      throw error;
    }
  }

  async getFileUrl(fileId) {
    try {
      await this.initialize();
      const file = await this.client.api(`/drives/${this.driveId}/items/${fileId}`)
        .select('id,webUrl,@microsoft.graph.downloadUrl')
        .get();
      
      // Return the download URL which is valid for a short time
      return file['@microsoft.graph.downloadUrl'];
    } catch (error) {
      console.error('Error getting OneDrive file URL:', error);
      throw error;
    }
  }

  async cleanup() {
    // No cleanup needed for OneDrive
    this.client = null;
  }
}

module.exports = new OneDriveStorageService(); 