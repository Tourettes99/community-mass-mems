import React, { useState, useEffect } from 'react';
import './App.css';
import MemoryCard from './components/MemoryCard';
import SocialScripts from './components/SocialScripts';

function App() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/get-memories');
      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }
      const data = await response.json();
      setMemories(data.memories);
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Community Mass Mems</h1>
        </header>
        <div className="loading">Loading memories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Community Mass Mems</h1>
        </header>
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={fetchMemories} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <SocialScripts />
      <header className="app-header">
        <h1>Community Mass Mems</h1>
      </header>
      <main className="memories-container">
        {memories.map((memory) => (
          <MemoryCard key={memory._id} memory={memory} />
        ))}
        {memories.length === 0 && (
          <div className="no-memories">
            <p>No memories found. Start by sharing your first memory!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
