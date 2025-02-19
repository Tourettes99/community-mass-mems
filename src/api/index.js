const API_BASE_URL = '/.netlify/functions';

export const fetchMemories = async () => {
  const response = await fetch(`${API_BASE_URL}/memories`);
  return response.json();
};

export const createMemory = async (memoryData) => {
  const response = await fetch(`${API_BASE_URL}/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(memoryData),
  });
  return response.json();
};

export const uploadFile = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};