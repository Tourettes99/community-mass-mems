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
      console.log('Loading memories...');
      const data = await fetchMemories();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array of memories');
      }
      
      setMemories(data);
      console.log(`Successfully loaded ${data.length} memories`);
    } catch (err) {
      console.error('Error in useMemories:', err);
      setError(err.message || 'Failed to load memories');
      
      // Retry logic for connection errors
      if (retryCount < 3 && err.message?.includes('network')) {
        setRetryCount(prev => prev + 1);
        setTimeout(loadMemories, 1000 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Expose reload function
  const reload = useCallback(() => {
    setRetryCount(0);
    loadMemories();
  }, [loadMemories]);

  return { memories, loading, error, reload };
};

export default useMemories;
