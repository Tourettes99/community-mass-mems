// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Base URL for API calls
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/api'
  : '/.netlify/functions/api';

// API endpoints
export const ENDPOINTS = {
  MEMORIES: '/memories',
  UPLOAD: '/upload'
};

// API functions
export const fetchMemories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.MEMORIES}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
};

export const uploadMemory = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.UPLOAD}`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error uploading memory:', error);
    throw error;
  }
};
