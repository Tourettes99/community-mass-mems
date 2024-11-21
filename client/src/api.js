// API configuration
import axios from 'axios';

const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? 'http://localhost:5000/api' : '/.netlify/functions/api';

// Create axios instance with base URL
const api = axios.create({
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

export const fetchMemories = async () => {
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
