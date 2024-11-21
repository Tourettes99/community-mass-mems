// API configuration
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'  // This will be redirected to /.netlify/functions/api by Netlify
  : 'http://localhost:5000/api';

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API endpoints
export const ENDPOINTS = {
  MEMORIES: '/memories',
  UPLOAD: '/upload',
  TEST: '/test'
};

// API functions
export const testAPI = async () => {
  try {
    const response = await api.get(ENDPOINTS.TEST);
    return response.data;
  } catch (error) {
    console.error('Error testing API:', error);
    throw error;
  }
};

export const getMemories = async () => {
  try {
    const response = await api.get(ENDPOINTS.MEMORIES);
    return response.data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
};

export const uploadMemory = async (formData) => {
  try {
    // For text memories, convert FormData to JSON
    if (formData.get('type') === 'text') {
      const data = {
        type: 'text',
        content: formData.get('content')
      };
      
      const response = await api.post(ENDPOINTS.UPLOAD, data);
      return response.data;
    }
    
    // For file uploads, use multipart/form-data
    const response = await api.post(ENDPOINTS.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading memory:', error);
    throw error;
  }
};

export const getMemoryFile = async (memoryId) => {
  try {
    const response = await api.get(`${ENDPOINTS.MEMORIES}/${memoryId}/file`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching memory file:', error);
    throw error;
  }
};
