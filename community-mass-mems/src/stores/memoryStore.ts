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
  
  addMemories: (newMemories) => set((state) => ({
    memories: [...newMemories, ...state.memories].sort((a, b) => 
      getValidDate(b.metadata?.createdAt) - getValidDate(a.metadata?.createdAt)
    )
  })),
  
  updateMemory: (updatedMemory) => set((state) => {
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
