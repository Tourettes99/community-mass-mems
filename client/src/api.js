// API configuration
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/.netlify/functions/api'  // Use Netlify Functions path in production
  : 'http://localhost:5000/api';

console.log('API Base URL:', API_BASE_URL);

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout
  timeout: 10000,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('Making request to:', config.url);
    console.log('Request config:', {
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('Response from:', response.config.url);
    console.log('Response status:', response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// API endpoints
const ENDPOINTS = {
  MEMORIES: '/memories',
  TEST_CONNECTION: '/test-connection'
};

// API functions
const testConnection = async () => {
  console.log('Testing connection...');
  try {
    const response = await api.get(ENDPOINTS.TEST_CONNECTION);
    console.log('Connection test response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error testing connection:', error);
    throw error;
  }
};

const getMemories = async () => {
  try {
    const response = await api.get(ENDPOINTS.MEMORIES);
    return response.data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
};

const uploadMemory = async (formData) => {
  try {
    // For text memories, convert FormData to JSON
    if (formData.get('type') === 'text') {
      const data = {
        type: 'text',
        title: formData.get('title'),
        description: formData.get('description'),
        text: formData.get('content')
      };
      
      const response = await api.post(ENDPOINTS.MEMORIES, data);
      return response.data;
    }
    
    // For file uploads, use multipart/form-data
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    const response = await api.post(ENDPOINTS.MEMORIES, formData, config);
    return response.data;
  } catch (error) {
    console.error('Error uploading memory:', error);
    throw error;
  }
};

const getMemoryFile = async (memoryId) => {
  try {
    const response = await api.get(`${ENDPOINTS.MEMORIES}/${memoryId}/file`);
    return response.data;
  } catch (error) {
    console.error('Error fetching memory file:', error);
    throw error;
  }
};

export { api, ENDPOINTS, getMemories, uploadMemory, getMemoryFile, testConnection };
