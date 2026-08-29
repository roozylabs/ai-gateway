export interface PrismClientOptions {
  baseURL?: string;
  apiKey?: string;
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  tool_choice?: string | Record<string, unknown>;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

export interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: UsageInfo;
  system_fingerprint?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
  finish_reason: string | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  usage?: UsageInfo;
}

export interface ModelInfo {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  provider?: string;
  description?: string;
}

export interface ModelListResponse {
  object: "list";
  data: ModelInfo[];
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  org_id: string;
  workspace_id?: string;
  project_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AgentPolicy {
  agent_id: string;
  allowed_models?: string[];
  allowed_tools?: string[];
  allowed_resources?: string[];
  allowed_mcp_servers?: string[];
  daily_budget_usd?: number;
  rate_limit_rpm?: number;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  workspace_id?: string;
  project_id?: string;
  policy?: Partial<AgentPolicy>;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: string;
  policy?: Partial<AgentPolicy>;
}

export interface Credential {
  id: string;
  provider_id: string;
  name: string;
  status: "active" | "degraded" | "cooldown" | "exhausted" | "disabled";
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface CredentialHealth {
  id: string;
  provider_name: string;
  health_score: number;
  status: string;
  success_rate: number;
  avg_latency_ms: number;
  error_rate_429: number;
  error_rate_5xx: number;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
  status: string;
}

export interface ToolExecutionRequest {
  tool_name: string;
  input: Record<string, unknown>;
}

export interface ToolExecutionResponse {
  invocation_id: string;
  status: "success" | "error";
  output: unknown;
  latency_ms: number;
  error_message?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface ResourceQueryRequest {
  resource_name: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface ResourceQueryResponse {
  query_id: string;
  status: "success" | "error";
  data: unknown;
  latency_ms: number;
}

export interface MCPServer {
  id: string;
  userId: string;
  name: string;
  displayName?: string;
  description?: string;
  type: "remote" | "local" | string;
  transportType?: string;
  url: string;
  status: string;
  enabled: boolean;
  hasAuthToken?: boolean;
  hasHeaders?: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  tools_count?: number;
}

export interface MCPTool {
  id: string;
  mcpServerId: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MCPServerWithTools {
  server: MCPServer;
  tools: MCPTool[];
}

export interface CreateMCPServerRequest {
  name: string;
  displayName?: string;
  description?: string;
  type?: "remote" | "local";
  transportType?: string;
  endpointUrl?: string;
  authToken?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface CandidateScoreDetail {
  modelId: string;
  slug: string;
  displayName: string;
  providerName: string;
  score: number;
  reasons?: string[];
  inputPrice1M?: number;
  outputPrice1M?: number;
}

export interface RoutingSimulateRequest {
  prompt?: string;
  model?: string;
  messages?: ChatMessage[];
  policyId?: string;
  policy?: string;
  customWeights?: Record<string, number>;
  budgetStatus?: string;
  providerId?: string;
}

export interface RoutingDecision {
  promptPreview: string;
  taskType: string;
  complexity: string;
  policyName: string;
  weightsUsed?: Record<string, number>;
  budgetStatus?: string;
  selectedModel: string;
  selectedProvider: string;
  candidates: CandidateScoreDetail[];
  downgradeReason?: string;

  // Legacy aliases
  requested_model?: string;
  selected_model?: string;
  selected_provider?: string;
  routing_policy?: string;
  score?: number;
  estimated_cost_usd?: number;
  expected_latency_ms?: number;
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  redis: string;
  version: string;
  timestamp: string;
}

export class PrismError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrismError";
  }
}

export class APIError extends PrismError {
  public status: number;
  public code?: string;

  constructor(status: number, message: string, code?: string) {
    super(`API Error ${status}: ${message}`);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }
}

export class AuthenticationError extends APIError {
  constructor(message = "Authentication failed") {
    super(401, message, "UNAUTHORIZED");
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends APIError {
  constructor(message = "Rate limit exceeded") {
    super(429, message, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

