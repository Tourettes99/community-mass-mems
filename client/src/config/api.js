const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  MEMORIES: `${API_BASE_URL}/api/memories`,
  UPLOAD: `${API_BASE_URL}/api/upload`,
};

export default API_BASE_URL;
