import { useState, useEffect } from 'react';
import { fetchMemories } from '../api';

const useMemories = () => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMemories = async () => {
      try {
        setLoading(true);
        const data = await fetchMemories();
        setMemories(data);
        setError(null);
      } catch (err) {
        setError('Failed to load memories');
        console.error('Error loading memories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMemories();
  }, []);

  return { memories, loading, error };
};

export default useMemories;
