export interface ApiGovernancePolicy {
  id: string;
  name: string;
  slug: string;
  description: string;
  policyType?: 'rbac' | 'rate_limit' | 'content_filter' | 'guardrail';
  enforcementLevel?: 'enforce' | 'audit_only' | 'disabled';
  rulesConfig?: Record<string, unknown>;
  role?: string;
  effect?: 'allow' | 'deny';
  agentPattern?: string;
  modelPattern?: string;
  toolPattern?: string;
  resourcePattern?: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCreateGovernancePolicyRequest {
  name: string;
  slug?: string;
  description?: string;
  policyType?: 'rbac' | 'rate_limit' | 'content_filter' | 'guardrail';
  enforcementLevel?: 'enforce' | 'audit_only' | 'disabled';
  rulesConfig?: Record<string, unknown>;
  role?: string;
  effect?: 'allow' | 'deny';
  agentPattern?: string;
  modelPattern?: string;
  toolPattern?: string;
  resourcePattern?: string;
  priority?: number;
  enabled?: boolean;
}

export interface ApiRBACEvaluationRequest {
  userId?: string;
  role?: string;
  action: string;
  resource: string;
  context?: Record<string, unknown>;
}

export interface ApiRBACEvaluationResult {
  allowed: boolean;
  reason?: string;
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  evalDurationMs: number;
}
