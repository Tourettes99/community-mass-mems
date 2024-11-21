const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-server.com'  // Replace with your production server URL
  : 'http://localhost:5000';

export const getFileUrl = (filename) => `${API_BASE_URL}/uploads/${filename}`;

export default API_BASE_URL;
