import { create } from 'zustand';
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

const getValidDate = (dateString?: string): number => {
  if (!dateString) return 0;
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  } catch {
    return 0;
  }
};

const useMemoryStore = create<MemoryStore>()((set) => ({
  memories: [],
  loading: false,
  error: null,
  
  setMemories: (memories) => set({ 
    memories: memories.sort((a, b) => 
      getValidDate(b.metadata?.createdAt) - getValidDate(a.metadata?.createdAt)
    )
  }),
  
  addMemories: (newMemories) => set((state) => {
    // Create a map of existing memories by ID for quick lookup
    const existingMemories = new Map(
      state.memories.map(m => [(m.id || m._id), m])
    );

    // Only add memories that don't already exist
    const uniqueNewMemories = newMemories.filter(
      m => !existingMemories.has(m.id || m._id)
    );

    return {
      memories: [...uniqueNewMemories, ...state.memories].sort((a, b) => 
        getValidDate(b.metadata?.createdAt) - getValidDate(a.metadata?.createdAt)
      )
    };
  }),
  
  updateMemory: (updatedMemory) => set((state) => {
    // Check if memory already exists
    const memoryExists = state.memories.some(
      m => m.id === updatedMemory.id || m._id === updatedMemory._id
    );

    if (!memoryExists) {
      return state;
    }

    const newMemories = state.memories.map((memory) => 
      (memory.id === updatedMemory.id || memory._id === updatedMemory._id) 
        ? { ...memory, ...updatedMemory }
        : memory
    );
    
    return {
      memories: newMemories.sort((a, b) => 
        getValidDate(b.metadata?.createdAt) - getValidDate(a.metadata?.createdAt)
      )
    };
  }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

export default useMemoryStore;
