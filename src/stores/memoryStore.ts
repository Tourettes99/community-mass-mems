import create from 'zustand';
import { Memory } from '../types/Memory';

interface MemoryStore {
  memories: Memory[];
  setMemories: (memories: Memory[]) => void;
  addMemories: (newMemories: Memory[]) => void;
  updateMemory: (updatedMemory: Memory) => void;
}

const useMemoryStore = create<MemoryStore>((set) => ({
  memories: [],
  
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
}));

export default useMemoryStore;
