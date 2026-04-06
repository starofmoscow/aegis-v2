'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: null });
    window.location.href = '/login';
  },

  initialize: async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    set({
      user: session?.user ?? null,
      session: session ?? null,
      loading: false,
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session: session ?? null,
        loading: false,
      });
    });
  },
}));
