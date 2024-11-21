// API configuration
import axios from 'axios';

// API Base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/api'  // Production URL
  : 'http://localhost:8888/.netlify/functions/api';  // Local development URL

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      data: config.data,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      message: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  testConnection: '/test-connection',
  memories: '/memories',
};

// API methods
export const testConnection = async () => {
  try {
    const response = await api.get(endpoints.testConnection);
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

export const createMemory = async (memoryData) => {
  try {
    const response = await api.post(endpoints.memories, memoryData);
    return response.data;
  } catch (error) {
    console.error('Failed to create memory:', error);
    throw error;
  }
};

export const getMemories = async () => {
  try {
    const response = await api.get(endpoints.memories);
    return response; // Return the full response object
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    throw error;
  }
};

export const getMemory = async (id) => {
  try {
    const response = await api.get(`${endpoints.memories}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch memory ${id}:`, error);
    throw error;
  }
};

export const uploadMemory = async (formData) => {
  console.log('%c📤 Uploading Memory', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  try {
    const config = {
      headers: {
        'Content-Type': formData.get('type') === 'text' ? 'application/json' : 'multipart/form-data',
      },
    };

    let response;
    if (formData.get('type') === 'text') {
      // For text memories, convert FormData to JSON
      const data = {
        type: 'text',
        title: formData.get('title'),
        description: formData.get('description'),
        text: formData.get('content')
      };
      response = await api.post(endpoints.memories, data, config);
    } else {
      // For file uploads, use multipart/form-data
      response = await api.post(endpoints.memories, formData, config);
    }

    console.log('%c✅ Memory Uploaded', 'font-size: 14px; font-weight: bold; color: #4CAF50');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('%c❌ Memory Upload Failed', 'font-size: 14px; font-weight: bold; color: #f44336');
    console.error('Error:', error);
    throw error;
  }
};

export const getMemoryFile = async (memoryId) => {
  console.log('%c📁 Fetching Memory File', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  try {
    const response = await api.get(`${endpoints.memories}/${memoryId}/file`);
    console.log('%c✅ Memory File Fetched', 'font-size: 14px; font-weight: bold; color: #4CAF50');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('%c❌ Memory File Fetch Failed', 'font-size: 14px; font-weight: bold; color: #f44336');
    console.error('Error:', error);
    throw error;
  }
};

export default api;
