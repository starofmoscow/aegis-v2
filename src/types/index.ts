// ============================================================
// EE AEGIS V2.0 — Core Type Definitions
// ============================================================

// AI Provider Types
export type AIProvider = 'claude' | 'openai' | 'gemini' | 'grok' | 'groq' | 'deepseek' | 'yandex';

export type AITaskType =
  | 'engineering-analysis'
  | 'document-generation'
  | 'financial-analysis'
  | 'research'
  | 'translation'
  | 'general-chat'
  | 'code-generation'
  | 'vision'
  | 'russian-compliance';

export type CostTier = 'budget' | 'standard' | 'premium';

export interface AIProviderConfig {
  name: string;
  provider: AIProvider;
  model: string;
  costTier: CostTier;
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindow: number;
  strengths: AITaskType[];
  available: boolean;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  provider?: AIProvider;
  model?: string;
}

export interface AIRouteDecision {
  provider: AIProvider;
  model: string;
  reason: string;
  costTier: CostTier;
  estimatedCost: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: AIProvider;
  model?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Project Types
export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed';
export type EPCPhase =
  | 'concept'
  | 'pre-feasibility'
  | 'feasibility'
  | 'feed'
  | 'detailed-engineering'
  | 'procurement'
  | 'construction'
  | 'commissioning';

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  status: ProjectStatus;
  phase: EPCPhase;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Engineering Types
export type CalculationType =
  | 'pressure-vessel'
  | 'heat-exchanger'
  | 'separator'
  | 'distillation'
  | 'pipe-sizing'
  | 'pump'
  | 'crude-oil';

export interface CalculationResult {
  type: CalculationType;
  inputs: Record<string, number | string>;
  outputs: Record<string, number | string>;
  warnings: string[];
  standards: string[];
  timestamp: Date;
}

// User Types
export type UserRole = 'admin' | 'engineer' | 'manager' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  company: string;
  createdAt: string;
}
