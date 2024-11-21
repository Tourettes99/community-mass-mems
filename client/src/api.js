// API configuration
import axios from 'axios';

// API Base URL configuration
const API_BASE_URL = '/.netlify/functions/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000 // 10 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    });
    throw error;
  }
);

// API endpoints
export const endpoints = {
  memories: '/memories',
  upload: '/memories/upload'
};

// API methods
export const fetchMemories = async () => {
  try {
    console.log('Fetching memories...');
    const response = await api.get(endpoints.memories);
    console.log(`Fetched ${response.data.length} memories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw new Error(error.response?.data?.error || 'Failed to load memories');
  }
};

export const uploadMemory = async (formData) => {
  try {
    console.log('Uploading memory...');
    const response = await api.post(endpoints.upload, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Memory uploaded successfully');
    return response.data;
  } catch (error) {
    console.error('Error uploading memory:', error);
    throw new Error(error.response?.data?.error || 'Failed to upload memory');
  }
};

export default api;
