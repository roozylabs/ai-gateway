export interface ApiAuditLogItem {
  id: string;
  timestamp: string;
  createdAt?: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  resource?: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
}

export interface ApiAIAuditTrail {
  id: string;
  requestId: string;
  organizationId: string;
  actorId: string;
  userId?: string;
  userRole?: string;
  agentName?: string;
  actorEmail?: string;
  action: string;
  model: string;
  modelSlug?: string;
  provider: string;
  complianceStatus?: string;
  promptSanitized?: string;
  responseSummary?: string;
  totalTokens: number;
  totalCostUsd: number;
  ipAddress?: string;
  userAgent?: string;
  checksum: string;
  verified: boolean;
  createdAt: string;
}

export interface ApiAuditVerificationResult {
  id: string;
  requestId: string;
  verified: boolean;
  valid?: boolean;
  tampered: boolean;
  signatureHash?: string;
  message?: string;
  calculatedChecksum: string;
  storedChecksum: string;
  checkedAt: string;
}
