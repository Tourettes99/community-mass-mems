import create from 'zustand';
import { Memory } from '../types/Memory';

interface MemoryStore {
  memories: Memory[];
  loading: boolean;
  error: string | null;
  setMemories: (memories: Memory[]) => void;
  addMemories: (newMemories: Memory[]) => void;
  updateMemory: (updatedMemory: Memory) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useMemoryStore = create<MemoryStore>((set) => ({
  memories: [],
  loading: false,
  error: null,
  
  setMemories: (memories) => set({ memories }),
  
  addMemories: (newMemories) => set((state) => ({
    memories: [...newMemories, ...state.memories].sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    )
  })),
  
  updateMemory: (updatedMemory) => set((state) => ({
    memories: state.memories.map((memory) => 
      memory._id === updatedMemory._id ? updatedMemory : memory
    )
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

export default useMemoryStore;
