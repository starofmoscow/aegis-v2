// ============================================================
// EE AEGIS V2.0 — AI Provider Registry
// Multi-provider configuration with cost tiers and routing
// ============================================================

import type { AIProviderConfig, AIProvider, AITaskType } from '@/types';

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  claude: {
    name: 'Claude Opus 4.6',
    provider: 'claude',
    model: 'claude-opus-4-6',
    costTier: 'premium',
    inputCostPer1M: 5.0,
    outputCostPer1M: 25.0,
    contextWindow: 1_000_000,
    strengths: ['engineering-analysis', 'document-generation', 'code-generation', 'financial-analysis'],
    available: false,
  },
  openai: {
    name: 'GPT-5.2',
    provider: 'openai',
    model: 'gpt-5.2',
    costTier: 'premium',
    inputCostPer1M: 1.75,
    outputCostPer1M: 14.0,
    contextWindow: 272_000,
    strengths: ['vision', 'general-chat', 'code-generation'],
    available: false,
  },
  gemini: {
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash-preview-04-17',
    costTier: 'budget',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    contextWindow: 1_000_000,
    strengths: ['research', 'document-generation', 'translation'],
    available: false,
  },
  grok: {
    name: 'Grok 4.1 Fast',
    provider: 'grok',
    model: 'grok-3-fast',
    costTier: 'budget',
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.50,
    contextWindow: 131_072,
    strengths: ['general-chat', 'research'],
    available: false,
  },
  groq: {
    name: 'Groq Llama',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    costTier: 'budget',
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
    contextWindow: 128_000,
    strengths: ['general-chat', 'code-generation'],
    available: false,
  },
  deepseek: {
    name: 'DeepSeek V4',
    provider: 'deepseek',
    model: 'deepseek-chat',
    costTier: 'budget',
    inputCostPer1M: 0.30,
    outputCostPer1M: 0.50,
    contextWindow: 1_000_000,
    strengths: ['code-generation', 'engineering-analysis', 'financial-analysis'],
    available: false,
  },
  yandex: {
    name: 'YandexGPT 5.1 Pro',
    provider: 'yandex',
    model: 'yandexgpt/latest',
    costTier: 'standard',
    inputCostPer1M: 0.80,
    outputCostPer1M: 0.80,
    contextWindow: 32_000,
    strengths: ['russian-compliance', 'translation'],
    available: false,
  },
};

// Task-to-provider priority mapping
// Claude is primary orchestrator, others are routed based on task type
export const TASK_ROUTING: Record<AITaskType, AIProvider[]> = {
  'engineering-analysis': ['claude', 'deepseek', 'openai', 'gemini'],
  'document-generation': ['claude', 'gemini', 'openai', 'deepseek'],
  'financial-analysis': ['claude', 'deepseek', 'openai', 'gemini'],
  'research': ['gemini', 'claude', 'grok', 'deepseek'],
  'translation': ['yandex', 'gemini', 'claude', 'openai'],
  'general-chat': ['claude', 'openai', 'gemini', 'grok', 'groq', 'deepseek'],
  'code-generation': ['claude', 'deepseek', 'openai', 'gemini'],
  'vision': ['openai', 'gemini', 'claude'],
  'russian-compliance': ['yandex', 'claude', 'gemini'],
};

export function getAvailableProviders(): AIProviderConfig[] {
  return Object.values(AI_PROVIDERS).filter(p => p.available);
}

export function getProviderForTask(taskType: AITaskType): AIProviderConfig | null {
  const priorities = TASK_ROUTING[taskType];
  for (const provider of priorities) {
    if (AI_PROVIDERS[provider].available) {
      return AI_PROVIDERS[provider];
    }
  }
  return null;
}
