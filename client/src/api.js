// API configuration
import axios from 'axios';

// API Base URL configuration
const API_BASE_URL = '/.netlify/functions/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// API endpoints
export const endpoints = {
  memories: '/memories',
  upload: '/memories/upload'
};

// API methods
export const fetchMemories = async () => {
  try {
    const response = await api.get(endpoints.memories);
    return response.data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
};

export const uploadMemory = async (formData) => {
  try {
    const response = await api.post(endpoints.upload, formData, {
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

export default api;
