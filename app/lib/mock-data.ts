export type RoutingStrategy = 'round-robin' | 'lru' | 'fallback';
export interface Provider {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
  enabled: boolean;
  credentialsCount: number;
  health: 'healthy' | 'degraded' | 'down';
  routingStrategy: RoutingStrategy;
}

export interface Credential {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  maskedKey: string;
  priority: number;
  status: 'ACTIVE' | 'RATE_LIMITED' | 'DISABLED' | 'INVALID';
  requestCount: number;
  lastUsed: string;
  cooldownEndsAt?: string;
}

export interface GatewayKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  lastUsed: string;
  requestCount: number;
}

export interface ModelRoute {
  id: string;
  alias: string;
  targetProvider: string;
  targetModel: string;
  status: 'ACTIVE' | 'INACTIVE';
  fallbackProvider?: string;
}

export interface RequestLog {
  id: string;
  requestId: string;
  timestamp: string;
  gatewayKeyName: string;
  provider: string;
  model: string;
  credentialName: string;
  statusCode: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  retryCount: number;
}

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'prov-1',
    name: 'Anthropic Production',
    code: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    enabled: true,
    credentialsCount: 3,
    health: 'healthy',
    routingStrategy: 'lru',
  },
  {
    id: 'prov-2',
    name: 'OpenAI Enterprise',
    code: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
    credentialsCount: 2,
    health: 'healthy',
    routingStrategy: 'round-robin',
  },
  {
    id: 'prov-3',
    name: 'Google Gemini AI',
    code: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    enabled: true,
    credentialsCount: 2,
    health: 'healthy',
    routingStrategy: 'fallback',
  },
  {
    id: 'prov-4',
    name: 'OpenRouter Fallback',
    code: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    enabled: false,
    credentialsCount: 1,
    health: 'degraded',
    routingStrategy: 'round-robin',
  },
];

export const MOCK_CREDENTIALS: Credential[] = [
  {
    id: 'cred-1',
    name: 'Anthropic Production #1',
    providerId: 'prov-1',
    providerName: 'Anthropic',
    maskedKey: 'sk-ant-api03-••••••••••••892a',
    priority: 1,
    status: 'ACTIVE',
    requestCount: 5412,
    lastUsed: '2 minutes ago',
  },
  {
    id: 'cred-2',
    name: 'Anthropic Production #2',
    providerId: 'prov-1',
    providerName: 'Anthropic',
    maskedKey: 'sk-ant-api03-••••••••••••419c',
    priority: 2,
    status: 'ACTIVE',
    requestCount: 3120,
    lastUsed: '5 minutes ago',
  },
  {
    id: 'cred-3',
    name: 'Anthropic Backup Key',
    providerId: 'prov-1',
    providerName: 'Anthropic',
    maskedKey: 'sk-ant-api03-••••••••••••102e',
    priority: 3,
    status: 'RATE_LIMITED',
    requestCount: 1840,
    lastUsed: '12 minutes ago',
    cooldownEndsAt: 'in 4 minutes',
  },
  {
    id: 'cred-4',
    name: 'OpenAI Primary Tier 5',
    providerId: 'prov-2',
    providerName: 'OpenAI',
    maskedKey: 'sk-proj-••••••••••••9941',
    priority: 1,
    status: 'ACTIVE',
    requestCount: 8910,
    lastUsed: '1 minute ago',
  },
  {
    id: 'cred-5',
    name: 'Google Gemini Pro Key',
    providerId: 'prov-3',
    providerName: 'Google',
    maskedKey: 'AIzaSy••••••••••••3310',
    priority: 1,
    status: 'ACTIVE',
    requestCount: 2150,
    lastUsed: '8 minutes ago',
  },
];

export const MOCK_GATEWAY_KEYS: GatewayKey[] = [
  {
    id: 'gwk-1',
    name: 'OpenCode Workspace Key',
    keyPrefix: 'gw_sk_live_opencode_89a...',
    status: 'ACTIVE',
    createdAt: '2026-08-01',
    lastUsed: 'Just now',
    requestCount: 8420,
  },
  {
    id: 'gwk-2',
    name: 'Claude Code Terminal',
    keyPrefix: 'gw_sk_live_claudecode_12f...',
    status: 'ACTIVE',
    createdAt: '2026-08-05',
    lastUsed: '3 minutes ago',
    requestCount: 3105,
  },
  {
    id: 'gwk-3',
    name: 'Antigravity IDE Assistant',
    keyPrefix: 'gw_sk_live_antigrav_77c...',
    status: 'ACTIVE',
    createdAt: '2026-08-10',
    lastUsed: '1 minute ago',
    requestCount: 4910,
  },
  {
    id: 'gwk-4',
    name: 'Legacy Staging Key',
    keyPrefix: 'gw_sk_test_legacy_001...',
    status: 'REVOKED',
    createdAt: '2026-07-15',
    lastUsed: '20 days ago',
    requestCount: 142,
  },
];

export const MOCK_MODELS: ModelRoute[] = [
  {
    id: 'mod-1',
    alias: 'claude-sonnet',
    targetProvider: 'Anthropic',
    targetModel: 'claude-3-7-sonnet-20250219',
    status: 'ACTIVE',
    fallbackProvider: 'OpenAI',
  },
  {
    id: 'mod-2',
    alias: 'gpt-4o',
    targetProvider: 'OpenAI',
    targetModel: 'gpt-4o-2024-08-06',
    status: 'ACTIVE',
    fallbackProvider: 'Anthropic',
  },
  {
    id: 'mod-3',
    alias: 'gemini-pro',
    targetProvider: 'Google',
    targetModel: 'gemini-1.5-pro-latest',
    status: 'ACTIVE',
    fallbackProvider: 'OpenRouter',
  },
  {
    id: 'mod-4',
    alias: 'claude-haiku',
    targetProvider: 'Anthropic',
    targetModel: 'claude-3-5-haiku-20241022',
    status: 'ACTIVE',
  },
];

export const MOCK_LOGS: RequestLog[] = [
  {
    id: 'log-101',
    requestId: 'req_8f91a29b',
    timestamp: '2026-08-18 17:48:12',
    gatewayKeyName: 'Antigravity IDE Assistant',
    provider: 'Anthropic',
    model: 'claude-sonnet',
    credentialName: 'Anthropic Production #1',
    statusCode: 200,
    latencyMs: 412,
    inputTokens: 1420,
    outputTokens: 530,
    retryCount: 0,
  },
  {
    id: 'log-102',
    requestId: 'req_3e44c12d',
    timestamp: '2026-08-18 17:47:58',
    gatewayKeyName: 'OpenCode Workspace Key',
    provider: 'OpenAI',
    model: 'gpt-4o',
    credentialName: 'OpenAI Primary Tier 5',
    statusCode: 200,
    latencyMs: 380,
    inputTokens: 890,
    outputTokens: 210,
    retryCount: 0,
  },
  {
    id: 'log-103',
    requestId: 'req_7b102e88',
    timestamp: '2026-08-18 17:46:10',
    gatewayKeyName: 'Claude Code Terminal',
    provider: 'Anthropic',
    model: 'claude-sonnet',
    credentialName: 'Anthropic Backup Key',
    statusCode: 429,
    latencyMs: 140,
    inputTokens: 2100,
    outputTokens: 0,
    retryCount: 1,
  },
  {
    id: 'log-104',
    requestId: 'req_7b102e88_retry',
    timestamp: '2026-08-18 17:46:11',
    gatewayKeyName: 'Claude Code Terminal',
    provider: 'Anthropic',
    model: 'claude-sonnet',
    credentialName: 'Anthropic Production #2',
    statusCode: 200,
    latencyMs: 520,
    inputTokens: 2100,
    outputTokens: 840,
    retryCount: 1,
  },
  {
    id: 'log-105',
    requestId: 'req_11099a4c',
    timestamp: '2026-08-18 17:45:00',
    gatewayKeyName: 'Antigravity IDE Assistant',
    provider: 'Google',
    model: 'gemini-pro',
    credentialName: 'Google Gemini Pro Key',
    statusCode: 200,
    latencyMs: 290,
    inputTokens: 3200,
    outputTokens: 1150,
    retryCount: 0,
  },
];
