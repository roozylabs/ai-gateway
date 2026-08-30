import { api } from './client';
import {
  ApiAuditLogItem,
  ApiAIAuditTrail,
  ApiAuditVerificationResult,
} from './types/audit';
import { PaginatedResult } from './types/common';

export async function apiGetAuditLogs(params?: {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  resourceType?: string;
}): Promise<PaginatedResult<ApiAuditLogItem>> {
  const response = await api.get<PaginatedResult<ApiAuditLogItem>>('/audit-trail/logs', { params });
  return response.data;
}

export async function apiExportAuditLogs(params?: {
  format?: 'json' | 'csv';
  startDate?: string;
  endDate?: string;
} | 'json' | 'csv'): Promise<Blob> {
  const queryParams = typeof params === 'string' ? { format: params } : params;
  const response = await api.get('/audit-trail/export', {
    params: queryParams,
    responseType: 'blob',
  });
  return response.data;
}

export async function apiGetAuditTrails(params?: {
  page?: number;
  limit?: number;
  actorId?: string;
  model?: string;
}): Promise<PaginatedResult<ApiAIAuditTrail>> {
  const response = await api.get<PaginatedResult<ApiAIAuditTrail>>('/audit-trail', { params });
  return response.data;
}

export async function apiGetAuditTrail(id: string): Promise<ApiAIAuditTrail> {
  const response = await api.get<ApiAIAuditTrail>(`/audit-trail/${id}`);
  return response.data;
}

export async function apiVerifyAuditIntegrity(id: string): Promise<ApiAuditVerificationResult> {
  const response = await api.post<ApiAuditVerificationResult>(`/audit-trail/${id}/verify`);
  return response.data;
}
