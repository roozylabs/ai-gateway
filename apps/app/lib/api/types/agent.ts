export interface ApiAgentTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  systemPrompt: string;
  suggestedModel: string;
  temperature: number;
  maxTokens: number;
  builtinToolNames?: string[];
  mcpServerSlugs?: string[];
  capabilities?: string[];
  tags?: string[];
  author: string;
  isOfficial: boolean;
  createdAt: string;
}

export interface ApiAgent {
  id: string;
  name: string;
  displayName?: string;
  slug: string;
  description: string;
  systemPrompt: string;
  systemPromptOverride?: string;
  model: string;
  agentType?: string;
  temperature: number;
  maxTokens: number;
  maxBudgetCents?: number;
  allowedModels?: string[];
  allowedTools?: string[];
  allowedResources?: string[];
  allowedMcpServers?: string[];
  toolNames?: string[];
  mcpServerIds?: string[];
  routingPolicyId?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCreateAgentRequest {
  name: string;
  displayName?: string;
  slug?: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  agentType?: string;
  temperature?: number;
  maxTokens?: number;
  maxBudgetCents?: number;
  allowedModels?: string[];
  allowedTools?: string[];
  allowedResources?: string[];
  allowedMcpServers?: string[];
  toolNames?: string[];
  mcpServerIds?: string[];
  routingPolicyId?: string;
  enabled?: boolean;
}

export interface ApiAgentStats {
  totalRequests: number;
  totalTokens: number;
  totalCostUSD: number;
  avgLatencyMs: number;
  successRate: number;
  toolCallsCount: number;
}
