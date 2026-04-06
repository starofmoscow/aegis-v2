'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/features/chat/hooks/useChat';
import { useUIStore } from '@/stores/ui';
import { Send, Square, Trash2, Bot, User, ChevronDown } from 'lucide-react';
import { AI_PROVIDERS } from '@/lib/ai/providers';
import type { AIProvider } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const providerOptions: { value: AIProvider | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto (Best for task)' },
  { value: 'claude', label: 'Claude Opus 4.6' },
  { value: 'openai', label: 'GPT-5.2' },
  { value: 'gemini', label: 'Gemini Flash' },
  { value: 'grok', label: 'Grok' },
  { value: 'groq', label: 'Groq (Llama)' },
  { value: 'deepseek', label: 'DeepSeek V4' },
  { value: 'yandex', label: 'YandexGPT 5.1' },
];

export default function ChatPage() {
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages } = useChat();
  const { activeProvider } = useUIStore();
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | 'auto'>('auto');
  const [showProviderSelect, setShowProviderSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) setShowProviderSelect(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const provider = selectedProvider === 'auto' ? undefined : selectedProvider;
    sendMessage(input, provider);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>AI Engineering Assistant</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Multi-provider AI with intelligent task routing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider Selector */}
          <div className="relative" ref={selectRef}>
            <button
              onClick={() => setShowProviderSelect(!showProviderSelect)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {providerOptions.find(p => p.value === selectedProvider)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showProviderSelect && (
              <div className="absolute top-full mt-1 right-0 w-52 rounded-lg overflow-hidden z-50" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                {providerOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelectedProvider(opt.value); setShowProviderSelect(false); }}
                    className="w-full text-left px-3 py-2 text-[12px] transition"
                    style={{
                      color: selectedProvider === opt.value ? 'var(--ee-crimson)' : 'var(--text-secondary)',
                      background: selectedProvider === opt.value ? 'var(--ee-crimson-light)' : 'transparent',
                      fontWeight: selectedProvider === opt.value ? 600 : 400,
                    }}
                    onMouseEnter={(e) => { if (selectedProvider !== opt.value) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                    onMouseLeave={(e) => { if (selectedProvider !== opt.value) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={clearMessages}
            className="p-1.5 rounded-md transition"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-light)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'var(--ee-navy)' }}>
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>AEGIS AI Assistant</h2>
            <p className="text-sm max-w-md" style={{ color: 'var(--text-tertiary)' }}>
              Ask me about engineering calculations, EPC project management, financial analysis, or anything related to your projects. I route your questions to the best AI provider automatically.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 max-w-lg justify-center">
              {[
                'Design a pressure vessel for 25 bar at 300°C',
                'Size a shell & tube heat exchanger',
                'Calculate pipe sizing for 150 m³/h crude',
                'Estimate CAPEX for a 15,000 BPD refinery',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-md text-[12px] transition"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ee-crimson)'; e.currentTarget.style.color = 'var(--ee-crimson)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{
              background: msg.role === 'user' ? 'var(--ee-navy)' : 'var(--ee-crimson-light)',
            }}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5" style={{ color: 'var(--ee-crimson)' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {msg.role === 'user' ? 'You' : 'AEGIS'}
                </span>
                {msg.provider && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    {msg.model || msg.provider}
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || (msg.isStreaming ? '...' : '')}
                  </ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 animate-pulse" style={{ background: 'var(--ee-crimson)' }} />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about engineering, finance, or EPC projects..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm resize-none"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          {isLoading ? (
            <button type="button" onClick={stopGeneration} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition" style={{ background: 'var(--error)' }}>
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-40" style={{ background: 'var(--ee-crimson)' }}>
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
