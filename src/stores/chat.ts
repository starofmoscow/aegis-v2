'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage, AIProvider } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  setMessageDone: (id: string, provider?: AIProvider, model?: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
}

let messageCounter = 0;

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,

      addMessage: (message) => {
        const id = `msg_${Date.now()}_${++messageCounter}`;
        set((state) => ({
          messages: [
            ...state.messages,
            { ...message, id, timestamp: new Date() },
          ],
        }));
        return id;
      },

      updateMessage: (id, content) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, content: m.content + content } : m,
          ),
        })),

      setMessageDone: (id, provider, model) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, isStreaming: false, provider, model } : m,
          ),
        })),

      clearMessages: () => set({ messages: [] }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: 'aegis-chat' },
  ),
);
