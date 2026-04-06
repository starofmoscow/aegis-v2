'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  activeProvider: AIProvider | null;
  activeModel: string | null;
  toggleSidebar: () => void;
  setActiveProvider: (provider: AIProvider | null) => void;
  setActiveModel: (model: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeProvider: null,
      activeModel: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setActiveProvider: (provider) => set({ activeProvider: provider }),
      setActiveModel: (model) => set({ activeModel: model }),
    }),
    { name: 'aegis-ui' },
  ),
);
