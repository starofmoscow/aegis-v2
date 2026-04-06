'use client';

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chat';
import { useUIStore } from '@/stores/ui';
import type { AIProvider } from '@/types';

export function useChat() {
  const { messages, isLoading, addMessage, updateMessage, setMessageDone, clearMessages, setLoading } = useChatStore();
  const { setActiveProvider, setActiveModel } = useUIStore();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, provider?: AIProvider) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    addMessage({ role: 'user', content });

    // Add empty assistant message for streaming
    const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true });

    setLoading(true);

    try {
      abortRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
          provider,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        updateMessage(assistantId, error.error || 'Failed to get response');
        setMessageDone(assistantId);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              updateMessage(assistantId, parsed.error);
              break;
            }
            if (parsed.content) {
              updateMessage(assistantId, parsed.content);
            }
            if (parsed.provider) {
              setActiveProvider(parsed.provider);
              setActiveModel(parsed.model || null);
            }
            if (parsed.done) {
              setMessageDone(assistantId, parsed.provider, parsed.model);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        updateMessage(assistantId, `Error: ${error.message}`);
      }
      setMessageDone(assistantId);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, addMessage, updateMessage, setMessageDone, setLoading, setActiveProvider, setActiveModel]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, [setLoading]);

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    clearMessages,
  };
}
