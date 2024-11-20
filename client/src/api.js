// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Base URL for API calls
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/api'
  : '/.netlify/functions/api';

// API endpoints
export const ENDPOINTS = {
  MEMORIES: '/memories',
  UPLOAD: '/upload',
  TEST: '/test'
};

// API functions
export const testAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.TEST}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error testing API:', error);
    throw error;
  }
};

export const fetchMemories = async () => {
  try {
    console.log('Fetching memories from:', `${API_BASE_URL}${ENDPOINTS.MEMORIES}`);
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.MEMORIES}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Received memories:', data);
    return data;
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
};

export const uploadMemory = async (formData) => {
  try {
    console.log('Uploading memory to:', `${API_BASE_URL}${ENDPOINTS.UPLOAD}`);
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.UPLOAD}`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Upload response:', data);
    return data;
  } catch (error) {
    console.error('Error uploading memory:', error);
    throw error;
  }
};
