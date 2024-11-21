import { useState, useEffect, useCallback } from 'react';
import { fetchMemories } from '../api';

const useMemories = () => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting memory fetch...');
      
      const data = await fetchMemories();
      console.log('Received response:', data);
      
      // Validate response
      if (!data) {
        throw new Error('No data received from server');
      }
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        throw new Error('Invalid response format: expected an array');
      }
      
      setMemories(data);
      console.log(`Successfully loaded ${data.length} memories`);
    } catch (err) {
      console.error('Error in useMemories:', err);
      let errorMessage = 'Failed to load memories';
      
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.error || err.response.data?.message || 'Server error';
        console.error('Server error details:', err.response.data);
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
      
      // Retry for network errors
      if (retryCount < 3 && (!err.response || err.response.status >= 500)) {
        console.log(`Retrying... Attempt ${retryCount + 1}/3`);
        setRetryCount(prev => prev + 1);
        setTimeout(loadMemories, 1000 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  // Load memories on mount
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Expose reload function
  const reload = useCallback(() => {
    setRetryCount(0);
    loadMemories();
  }, [loadMemories]);

  return { 
    memories, 
    loading, 
    error,
    reload,
    retryCount
  };
};

export default useMemories;
