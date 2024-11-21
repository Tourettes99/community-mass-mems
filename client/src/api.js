// API configuration
import axios from 'axios';

// API Base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://shiny-jalebi-9ccb2b.netlify.app/.netlify/functions/api'  // Production URL
  : 'http://localhost:8888/.netlify/functions/api';  // Local development URL

// Log environment configuration
console.log('%c🌐 API Configuration', 'font-size: 14px; font-weight: bold; color: #2196F3');
console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('%c📤 Outgoing Request', 'font-size: 14px; font-weight: bold; color: #4CAF50');
    console.log('URL:', config.baseURL + config.url);
    console.log('Method:', config.method.toUpperCase());
    console.log('Headers:', config.headers);
    if (config.data) {
      console.log('Data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('%c❌ Request Error', 'font-size: 14px; font-weight: bold; color: #f44336');
    console.error('Error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('%c📥 Response Received', 'font-size: 14px; font-weight: bold; color: #2196F3');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', response.headers);
    console.log('Data:', response.data);
    return response;
  },
  (error) => {
    console.error('%c❌ Response Error', 'font-size: 14px; font-weight: bold; color: #f44336');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    console.error('Config:', error.config);
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
  console.log('%c🔌 Testing Connection', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  try {
    const response = await api.get(ENDPOINTS.TEST_CONNECTION);
    console.log('%c✅ Connection Test Success', 'font-size: 14px; font-weight: bold; color: #4CAF50');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('%c❌ Connection Test Failed', 'font-size: 14px; font-weight: bold; color: #f44336');
    console.error('Error:', error);
    throw error;
  }
};

const getMemories = async () => {
  console.log('%c📚 Fetching Memories', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  try {
    const response = await api.get(ENDPOINTS.MEMORIES);
    console.log('%c✅ Memories Fetched', 'font-size: 14px; font-weight: bold; color: #4CAF50');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('%c❌ Memories Fetch Failed', 'font-size: 14px; font-weight: bold; color: #f44336');
    console.error('Error:', error);
    throw error;
  }
};

const uploadMemory = async (formData) => {
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
      response = await api.post(ENDPOINTS.MEMORIES, data, config);
    } else {
      // For file uploads, use multipart/form-data
      response = await api.post(ENDPOINTS.MEMORIES, formData, config);
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

const getMemoryFile = async (memoryId) => {
  console.log('%c📁 Fetching Memory File', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  try {
    const response = await api.get(`${ENDPOINTS.MEMORIES}/${memoryId}/file`);
    console.log('%c✅ Memory File Fetched', 'font-size: 14px; font-weight: bold; color: #4CAF50');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('%c❌ Memory File Fetch Failed', 'font-size: 14px; font-weight: bold; color: #f44336');
    console.error('Error:', error);
    throw error;
  }
};

export { api, ENDPOINTS, getMemories, uploadMemory, getMemoryFile, testConnection };
