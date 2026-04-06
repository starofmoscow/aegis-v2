'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/features/chat/hooks/useChat';
import { useUIStore } from '@/stores/ui';
import {
  Send, Square, RotateCcw, Bot, User, ChevronDown, Sparkles,
  Cpu, Zap, Globe, Brain, Check, Copy,
} from 'lucide-react';
import type { AIProvider } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ── Provider metadata ───────────────────────────────── */
const providers: { value: AIProvider | 'auto'; label: string; sub: string; icon: React.ElementType; color: string }[] = [
  { value: 'auto', label: 'Auto Router', sub: 'Best AI for each task', icon: Sparkles, color: 'var(--accent)' },
  { value: 'claude', label: 'Claude Opus 4.6', sub: 'Anthropic', icon: Brain, color: 'var(--ee-crimson)' },
  { value: 'openai', label: 'GPT-5.2', sub: 'OpenAI', icon: Zap, color: '#10A37F' },
  { value: 'gemini', label: 'Gemini 2.5 Flash', sub: 'Google', icon: Globe, color: '#4285F4' },
  { value: 'grok', label: 'Grok 3', sub: 'xAI', icon: Cpu, color: '#1DA1F2' },
  { value: 'groq', label: 'Llama 4 Scout', sub: 'Groq', icon: Zap, color: '#7C3AED' },
  { value: 'deepseek', label: 'DeepSeek V4', sub: 'DeepSeek', icon: Brain, color: '#0EA5E9' },
  { value: 'yandex', label: 'YandexGPT 5 Pro', sub: 'Yandex Cloud', icon: Globe, color: '#FF0000' },
];

const suggestedPrompts = [
  { text: 'Design a pressure vessel for 25 bar at 300\u00b0C', category: 'Engineering' },
  { text: 'Size a shell & tube heat exchanger for crude', category: 'Engineering' },
  { text: 'Estimate CAPEX for a 15,000 BPD modular refinery', category: 'Finance' },
  { text: 'Compare EPC delivery models for greenfield projects', category: 'Strategy' },
];

/* ── Copy button for code blocks ─────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="aegis-btn-ghost p-1 rounded" title="Copy code">
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Main Chat Page ──────────────────────────────────── */
export default function ChatPage() {
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages } = useChat();
  const { activeProvider } = useUIStore();
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | 'auto'>('auto');
  const [showProviderSelect, setShowProviderSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) setShowProviderSelect(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Auto-resize textarea */
  const adjustTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => { adjustTextarea(); }, [input, adjustTextarea]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
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

  const currentProvider = providers.find(p => p.value === selectedProvider);

  return (
    <div className="flex flex-col h-full -m-6">

      {/* ── Messages Area ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-6 py-6">

          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center aegis-fade-in">
              <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, var(--ee-crimson), var(--ee-navy))' }}>
                <Bot className="w-8 h-8 text-white" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--success)', border: '2px solid var(--bg-primary)' }}>
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                AEGIS AI Assistant
              </h2>
              <p className="text-[13px] max-w-md leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Multi-provider AI with intelligent routing. Ask about engineering calculations,
                EPC project management, financial analysis, or strategy.
              </p>

              <div className="grid grid-cols-2 gap-2.5 mt-8 w-full max-w-lg">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => { setInput(prompt.text); inputRef.current?.focus(); }}
                    className="aegis-card aegis-card-interactive p-3.5 text-left group"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--ee-crimson)' }}>{prompt.category}</span>
                    <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {prompt.text}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-8">
                {providers.slice(1).map(p => (
                  <div key={p.value} className="w-2 h-2 rounded-full" style={{ background: p.color, opacity: 0.5 }} title={p.label} />
                ))}
                <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>7 AI providers connected</span>
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 mb-6 ${idx === 0 ? 'aegis-slide-in' : ''}`}>
                {/* Avatar */}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{
                  background: isUser
                    ? 'linear-gradient(135deg, var(--ee-navy), #2A3F6B)'
                    : 'var(--ee-crimson-light)',
                }}>
                  {isUser
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5" style={{ color: 'var(--ee-crimson)' }} />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {isUser ? 'You' : 'AEGIS'}
                    </span>
                    {msg.provider && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: providers.find(p => p.value === msg.provider)?.color || 'var(--text-muted)',
                        }}>
                        {msg.model || msg.provider}
                      </span>
                    )}
                  </div>

                  {isUser ? (
                    <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {msg.content}
                    </p>
                  ) : (
                    <div className="aegis-prose text-[13.5px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || (msg.isStreaming ? '' : '')}
                      </ReactMarkdown>
                      {msg.isStreaming && (
                        <span className="inline-flex gap-0.5 ml-0.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full aegis-pulse" style={{ background: 'var(--ee-crimson)' }} />
                          <span className="w-1.5 h-1.5 rounded-full aegis-pulse" style={{ background: 'var(--ee-crimson)', animationDelay: '0.3s' }} />
                          <span className="w-1.5 h-1.5 rounded-full aegis-pulse" style={{ background: 'var(--ee-crimson)', animationDelay: '0.6s' }} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input Area ───────────────────────────────── */}
      <div className="shrink-0" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-[800px] mx-auto px-6 py-3">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-2 rounded-xl p-1.5"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', transition: 'border-color var(--transition-fast)' }}>

              {/* Provider selector */}
              <div className="relative shrink-0" ref={selectRef}>
                <button
                  type="button"
                  onClick={() => setShowProviderSelect(!showProviderSelect)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-medium"
                  style={{
                    color: currentProvider?.color || 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {currentProvider && <currentProvider.icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{currentProvider?.label || 'Auto'}</span>
                  <ChevronDown className="w-3 h-3" style={{ opacity: 0.5 }} />
                </button>

                {showProviderSelect && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl overflow-hidden z-50 aegis-slide-in"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
                    <div className="p-1.5">
                      {providers.map(opt => {
                        const isActive = selectedProvider === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setSelectedProvider(opt.value); setShowProviderSelect(false); }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3"
                            style={{
                              transition: 'all var(--transition-fast)',
                              background: isActive ? 'var(--ee-crimson-light)' : 'transparent',
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--ee-crimson-light)' : 'transparent'; }}
                          >
                            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: `${opt.color}15`, color: opt.color }}>
                              <opt.icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium truncate" style={{
                                color: isActive ? 'var(--ee-crimson)' : 'var(--text-primary)',
                              }}>{opt.label}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{opt.sub}</p>
                            </div>
                            {isActive && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ee-crimson)' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about engineering, finance, or EPC projects..."
                rows={1}
                className="flex-1 px-2 py-2 text-[13.5px] resize-none bg-transparent outline-none"
                style={{ color: 'var(--text-primary)', minHeight: 40, maxHeight: 200 }}
              />

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearMessages}
                    className="p-2 rounded-lg"
                    style={{ color: 'var(--text-muted)', transition: 'all var(--transition-fast)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-light)'; e.currentTarget.style.color = 'var(--error)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    title="Clear conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {isLoading ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--error)', color: 'white', transition: 'all var(--transition-fast)' }}
                  >
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2 rounded-lg disabled:opacity-30"
                    style={{
                      background: input.trim() ? 'var(--ee-crimson)' : 'transparent',
                      color: input.trim() ? 'white' : 'var(--text-muted)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              AEGIS routes your query to the optimal AI provider. Press <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ background: 'var(--bg-tertiary)' }}>Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ background: 'var(--bg-tertiary)' }}>Shift+Enter</kbd> for new line.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
