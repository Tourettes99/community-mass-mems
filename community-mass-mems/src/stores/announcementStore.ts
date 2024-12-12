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
  addAnnouncement: (message: string) => void;
  markAsRead: (id: string) => void;
  clearAnnouncements: () => void;
}

const useAnnouncementStore = create<AnnouncementStore>()(
  persist(
    (set) => ({
      announcements: [],
      addAnnouncement: (message: string) =>
        set((state) => ({
          announcements: [
            {
              id: Date.now().toString(),
              message,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.announcements,
          ],
        })),
      markAsRead: (id: string) =>
        set((state) => ({
          announcements: state.announcements.map((announcement) =>
            announcement.id === id ? { ...announcement, read: true } : announcement
          ),
        })),
      clearAnnouncements: () => set({ announcements: [] }),
    }),
    {
      name: 'announcement-storage',
    }
  )
);

export default useAnnouncementStore;
