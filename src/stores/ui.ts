'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProvider } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  activeProvider: AIProvider | null;
  activeModel: string | null;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setActiveProvider: (provider: AIProvider | null) => void;
  setActiveModel: (model: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    localStorage.setItem('aegis-theme', 'dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
    localStorage.setItem('aegis-theme', 'light');
  } else {
    localStorage.removeItem('aegis-theme');
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'dark',
      activeProvider: null,
      activeModel: null,
      commandPaletteOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setActiveProvider: (provider) => set({ activeProvider: provider }),
      setActiveModel: (model) => set({ activeModel: model }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'aegis-ui',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);
