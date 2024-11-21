const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/.netlify/functions/api'  // Use Netlify Functions path in production
  : 'http://localhost:5000/api';

export const getFileUrl = (filename) => {
  if (process.env.NODE_ENV === 'production') {
    return `/.netlify/functions/api/files/${filename}`;
  }
  return `${API_BASE_URL}/files/${filename}`;
};

export default API_BASE_URL;
