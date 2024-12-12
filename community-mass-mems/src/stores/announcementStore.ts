import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Announcement {
  id: string;
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
          const response = await fetch('/.netlify/functions/getAnnouncements');
          if (!response.ok) throw new Error('Failed to fetch announcements');
          
          const announcements = await response.json();
          const { readAnnouncements } = get();
          
          set({
            announcements: announcements.map((ann: any) => ({
              id: ann._id,
              message: ann.message,
              timestamp: ann.timestamp,
              read: readAnnouncements.has(ann._id)
            }))
          });
        } catch (error) {
          console.error('Error fetching announcements:', error);
        }
      },

      markAsRead: (id: string) =>
        set((state) => {
          const newReadAnnouncements = new Set(state.readAnnouncements);
          newReadAnnouncements.add(id);
          
          return {
            readAnnouncements: newReadAnnouncements,
            announcements: state.announcements.map((announcement) =>
              announcement.id === id ? { ...announcement, read: true } : announcement
            ),
          };
        }),
    }),
    {
      name: 'announcement-storage',
      partialize: (state) => ({ readAnnouncements: Array.from(state.readAnnouncements) }),
    }
  )
);

export default useAnnouncementStore;
