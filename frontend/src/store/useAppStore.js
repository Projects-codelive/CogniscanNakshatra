import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      patientName: 'Eleanor Miller',
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      cogniScore: 72,
      setCogniScore: (score) => set({ cogniScore: score }),
      streak: 5,
      setStreak: (streak) => set({ streak }),
    }),
    {
      name: 'nakshatra-app',
    }
  )
);
