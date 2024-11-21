import React, { useState, useEffect } from 'react';
import './App.css';
import MemoryCard from './components/MemoryCard';

function App() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-memories');
      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }
      const data = await response.json();
      setMemories(data.memories);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading memories...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Community Mass Mems</h1>
      </header>
      <main className="memories-container">
        {memories.map((memory) => (
          <MemoryCard key={memory._id} memory={memory} />
        ))}
      </main>
    </div>
  );
}

export default App;
