import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Announcement {
  _id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AnnouncementStore {
  announcements: Announcement[];
  fetchAnnouncements: () => Promise<void>;
  markAsRead: (id: string) => void;
  readAnnouncements: Set<string>;
}

const useAnnouncementStore = create<AnnouncementStore>()(
  persist(
    (set, get) => ({
      announcements: [],
      readAnnouncements: new Set<string>(),
      
      fetchAnnouncements: async () => {
        try {
          console.log('Fetching announcements...');
          const response = await fetch('/.netlify/functions/getAnnouncements');
          if (!response.ok) {
            throw new Error(`Failed to fetch announcements: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Received announcements:', data);
          
          if (!Array.isArray(data)) {
            console.error('Expected array of announcements, got:', typeof data);
            return;
          }

          const { readAnnouncements } = get();
          const readSet = new Set(readAnnouncements);
          
          const processedAnnouncements = data.map((ann: any) => ({
            _id: ann._id,
            message: ann.message || '',
            timestamp: ann.timestamp || ann.createdAt || new Date().toISOString(),
            read: readSet.has(ann._id)
          }));

          console.log('Processed announcements:', processedAnnouncements);
          
          set({ announcements: processedAnnouncements });
        } catch (error) {
          console.error('Error fetching announcements:', error);
        }
      },

      markAsRead: (id: string) => {
        const { readAnnouncements, announcements } = get();
        const newReadSet = new Set(readAnnouncements);
        newReadSet.add(id);
        
        set({
          readAnnouncements: newReadSet,
          announcements: announcements.map(ann => 
            ann._id === id ? { ...ann, read: true } : ann
          )
        });
      }
    }),
    {
      name: 'announcement-storage',
      partialize: (state) => ({ readAnnouncements: Array.from(state.readAnnouncements) })
    }
  )
);

export default useAnnouncementStore;
