// ============================================================
// EE AEGIS V2.0 — AI Orchestration Engine
// Central router: Claude as primary, fallback chain to all providers
// Streaming support, cost tracking, provider health monitoring
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import type { AIProvider, AIMessage, AITaskType, AIRouteDecision } from '@/types';
import { AI_PROVIDERS, TASK_ROUTING } from './providers';

// ── Provider Initialization ──────────────────────────────

function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function getGeminiClient(): GoogleGenerativeAI | null {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

function getGrokClient(): OpenAI | null {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: 'https://api.x.ai/v1' });
}

function getDeepSeekClient(): OpenAI | null {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
}

// ── Provider Availability Check ──────────────────────────

export function checkProviderAvailability(): Record<AIProvider, boolean> {
  const availability: Record<AIProvider, boolean> = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GOOGLE_AI_API_KEY,
    grok: !!process.env.XAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    yandex: !!process.env.YANDEX_API_KEY,
  };

  // Update provider configs
  for (const [key, available] of Object.entries(availability)) {
    AI_PROVIDERS[key as AIProvider].available = available;
  }

  return availability;
}

// ── Task Classification ──────────────────────────────────

const TASK_KEYWORDS: Record<AITaskType, string[]> = {
  'engineering-analysis': ['calculate', 'design', 'sizing', 'pressure', 'vessel', 'heat exchanger', 'separator', 'pipe', 'pump', 'distillation', 'ASME', 'API', 'TEMA', 'engineering'],
  'document-generation': ['report', 'document', 'specification', 'datasheet', 'generate document', 'write report', 'create spec'],
  'financial-analysis': ['cost', 'budget', 'financial', 'ROI', 'NPV', 'IRR', 'investment', 'CAPEX', 'OPEX', 'feasibility'],
  'research': ['research', 'find', 'search', 'compare', 'analyze market', 'industry', 'benchmark'],
  'translation': ['translate', 'перевод', 'переведи', 'in Russian', 'на русском', 'translation'],
  'general-chat': ['hello', 'help', 'explain', 'what is', 'how to', 'tell me'],
  'code-generation': ['code', 'function', 'script', 'program', 'implement', 'build', 'create app'],
  'vision': ['image', 'diagram', 'P&ID', 'drawing', 'photo', 'picture', 'visual'],
  'russian-compliance': ['152-ФЗ', '152-FZ', 'Russian law', 'Роскомнадзор', 'российское законодательство', 'Russian compliance'],
};

export function classifyTask(message: string): AITaskType {
  const lower = message.toLowerCase();
  let bestMatch: AITaskType = 'general-chat';
  let bestScore = 0;

  for (const [taskType, keywords] of Object.entries(TASK_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = taskType as AITaskType;
    }
  }

  return bestMatch;
}

// ── Route Decision ───────────────────────────────────────

export function routeTask(
  taskType: AITaskType,
  preferredProvider?: AIProvider
): AIRouteDecision {
  checkProviderAvailability();

  // If user explicitly chose a provider and it's available
  if (preferredProvider && AI_PROVIDERS[preferredProvider]?.available) {
    const config = AI_PROVIDERS[preferredProvider];
    return {
      provider: preferredProvider,
      model: config.model,
      reason: `User selected ${config.name}`,
      costTier: config.costTier,
      estimatedCost: 0,
    };
  }

  // Auto-route based on task type with fallback chain
  const priorities = TASK_ROUTING[taskType];
  for (const provider of priorities) {
    if (AI_PROVIDERS[provider].available) {
      const config = AI_PROVIDERS[provider];
      return {
        provider,
        model: config.model,
        reason: `Best available for ${taskType}: ${config.name}`,
        costTier: config.costTier,
        estimatedCost: 0,
      };
    }
  }

  throw new Error('No AI providers available. Please configure at least one API key.');
}

// ── System Prompts ───────────────────────────────────────

const SYSTEM_PROMPT = `You are AEGIS, the AI engineering assistant for EE AEGIS V2.0 — an autonomous EPC (Engineering, Procurement, Construction) platform developed by LLC Energy & Engineering.

You assist engineers, project managers, and executives with:
- Engineering calculations (pressure vessels, heat exchangers, separators, pipes, pumps, distillation columns)
- EPC project management across all phases (concept through commissioning)
- Financial analysis (CAPEX/OPEX estimation, feasibility studies, ROI analysis)
- Document generation (technical specifications, datasheets, reports)
- Research and market analysis for oil & gas, petrochemical, and energy projects
- Russian and international regulatory compliance

You follow these engineering standards:
- ASME BPVC Section VIII Division 1 (pressure vessels)
- TEMA Standards 11th Edition (heat exchangers)
- API 12J 9th Edition (separators)
- ASME B31.3-2024 (process piping)
- ISA 5.1-2024 (P&ID symbology)

Respond professionally, concisely, and with engineering precision. Use SI units by default, with Imperial equivalents where helpful. Always cite applicable standards.`;

// ── Streaming API Calls ──────────────────────────────────

export async function* streamFromProvider(
  provider: AIProvider,
  messages: AIMessage[],
  model: string,
): AsyncGenerator<string> {
  switch (provider) {
    case 'claude':
      yield* streamClaude(messages, model);
      break;
    case 'openai':
      yield* streamOpenAI(messages, model);
      break;
    case 'gemini':
      yield* streamGemini(messages, model);
      break;
    case 'grok':
      yield* streamGrok(messages, model);
      break;
    case 'groq':
      yield* streamGroq(messages, model);
      break;
    case 'deepseek':
      yield* streamDeepSeek(messages, model);
      break;
    case 'yandex':
      // YandexGPT doesn't support streaming well — use non-streaming
      yield await callYandex(messages, model);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ── Provider-Specific Implementations ────────────────────

async function* streamClaude(messages: AIMessage[], model: string): AsyncGenerator<string> {
  const client = getAnthropicClient();
  if (!client) throw new Error('Anthropic API key not configured');

  const stream = await client.messages.stream({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

async function* streamOpenAI(messages: AIMessage[], model: string): AsyncGenerator<string> {
  const client = getOpenAIClient();
  if (!client) throw new Error('OpenAI API key not configured');

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

async function* streamGemini(messages: AIMessage[], model: string): AsyncGenerator<string> {
  const client = getGeminiClient();
  if (!client) throw new Error('Google AI API key not configured');

  const genModel = client.getGenerativeModel({ model });
  const chat = genModel.startChat({
    history: messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

async function* streamGrok(messages: AIMessage[], model: string): AsyncGenerator<string> {
  const client = getGrokClient();
  if (!client) throw new Error('xAI/Grok API key not configured');

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

async function* streamGroq(messages: AIMessage[], model: string): AsyncGenerator<string> {
  const client = getGroqClient();
  if (!client) throw new Error('Groq API key not configured');

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

async function* streamDeepSeek(messages: AIMessage[], model: string): AsyncGenerator<string> {
  const client = getDeepSeekClient();
  if (!client) throw new Error('DeepSeek API key not configured');

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

async function callYandex(messages: AIMessage[], _model: string): Promise<string> {
  const apiKey = process.env.YANDEX_API_KEY;
  const folderId = process.env.YANDEX_FOLDER_ID;
  if (!apiKey || !folderId) throw new Error('YandexGPT API key or folder ID not configured');

  const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
    },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/yandexgpt/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.3,
        maxTokens: 4096,
      },
      messages: [
        { role: 'system', text: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, text: m.content })),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`YandexGPT error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.result?.alternatives?.[0]?.message?.text || 'No response from YandexGPT';
}

// ── Main Orchestration Function ──────────────────────────

export async function* orchestrate(
  messages: AIMessage[],
  taskType?: AITaskType,
  preferredProvider?: AIProvider,
): AsyncGenerator<{ content: string; provider: AIProvider; model: string; done: boolean }> {
  // Classify task if not specified
  const lastMessage = messages[messages.length - 1]?.content || '';
  const resolvedTaskType = taskType || classifyTask(lastMessage);

  // Route to best available provider
  const decision = routeTask(resolvedTaskType, preferredProvider);

  // Stream response
  const stream = streamFromProvider(decision.provider, messages, decision.model);

  for await (const chunk of stream) {
    yield {
      content: chunk,
      provider: decision.provider,
      model: decision.model,
      done: false,
    };
  }

  yield {
    content: '',
    provider: decision.provider,
    model: decision.model,
    done: true,
  };
}
