import axios from 'axios';
import Cookies from 'js-cookie';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API Models matching Backend structs

export interface ApiProvider {
  id: string;
  userId?: string;
  name: string;
  slug: string;
  baseUrl: string;
  type: string;
  enabled: boolean;
  routingStrategy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCredential {
  id: string;
  providerId: string;
  name: string;
  keyPrefix: string;
  maskedKey?: string;
  apiKey?: string;
  priority: number;
  enabled: boolean;
  status: string;
  lastUsedAt?: string;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
  isCoolingDown?: boolean;
  cooldownTtl?: number;
}

export interface ApiModel {
  id: string;
  providerId: string;
  name: string;
  slug: string;
  displayName: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiGatewayKey {
  id: string;
  userId?: string;
  providerId?: string;
  name: string;
  keyPrefix: string;
  rawKey?: string;
  enabled: boolean;
  rateLimit: number;
  allowedModels?: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  requestCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiRequestLog {
  id: string;
  gatewayApiKeyId?: string;
  providerId?: string;
  credentialId?: string;
  credentialName?: string;
  model: string;
  statusCode: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

export interface ApiDashboardStats {
  totalRequests: number;
  totalTokens: number;
  avgLatency: number;
  errorRate: number;
  activeProviders: number;
  activeCredentials: number;
  activeKeys: number;
}

export interface ApiUsagePoint {
  date: string;
  model?: string;
  requests: number;
  tokens: number;
}

export interface ApiProviderHealth {
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down';
  credCount: number;
}

export interface ApiSetting {
  id?: string;
  key: string;
  value: string;
  category?: string;
}

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If 401 unauthorized, clear auth token cookie
      Cookies.remove('auth_token');
    }
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Auth API
export async function apiLogin(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);
  return response.data;
}

export async function apiLogout(): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/logout');
  return response.data;
}

export async function apiGetMe(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}

// Dashboard API
export async function apiGetDashboardStats(): Promise<ApiDashboardStats> {
  const response = await api.get<ApiDashboardStats>('/dashboard/stats');
  return response.data;
}

export async function apiGetDashboardUsage(params?: { days?: number; startDate?: string; endDate?: string }): Promise<ApiUsagePoint[]> {
  const response = await api.get<ApiUsagePoint[]>('/dashboard/usage', { params });
  return response.data;
}

export async function apiGetDashboardHealth(): Promise<ApiProviderHealth[]> {
  const response = await api.get<ApiProviderHealth[]>('/dashboard/health');
  return response.data;
}

// Providers API
export async function apiGetProviders(): Promise<ApiProvider[]> {
  const response = await api.get<ApiProvider[]>('/providers');
  return response.data;
}

export async function apiCreateProvider(data: Partial<ApiProvider>): Promise<ApiProvider> {
  const response = await api.post<ApiProvider>('/providers', data);
  return response.data;
}

export async function apiUpdateProvider(id: string, data: Partial<ApiProvider>): Promise<ApiProvider> {
  const response = await api.put<ApiProvider>(`/providers/${id}`, data);
  return response.data;
}

export async function apiDeleteProvider(id: string): Promise<void> {
  await api.delete(`/providers/${id}`);
}

// Credentials API
export async function apiGetCredentials(
  providerId: string,
  params?: { page?: number; limit?: number; search?: string }
): Promise<PaginatedResult<ApiCredential>> {
  const response = await api.get<PaginatedResult<ApiCredential>>(`/providers/${providerId}/credentials`, { params });
  return response.data;
}

export async function apiCreateCredential(providerId: string, data: Partial<ApiCredential> & { apiKey: string }): Promise<ApiCredential> {
  const response = await api.post<ApiCredential>(`/providers/${providerId}/credentials`, data);
  return response.data;
}

export async function apiUpdateCredential(providerId: string, credId: string, data: Partial<ApiCredential>): Promise<ApiCredential> {
  const response = await api.put<ApiCredential>(`/providers/${providerId}/credentials/${credId}`, data);
  return response.data;
}

export async function apiDeleteCredential(providerId: string, credId: string): Promise<void> {
  await api.delete(`/providers/${providerId}/credentials/${credId}`);
}

export interface ApiTestCredentialResult {
  success: boolean;
  latencyMs: number;
  httpStatus: number;
  error?: string;
  message?: string;
}

export async function apiTestCredential(
  providerId: string,
  credId: string
): Promise<ApiTestCredentialResult> {
  const response = await api.post<ApiTestCredentialResult>(`/providers/${providerId}/credentials/${credId}/test`);
  return response.data;
}

export async function apiRevealCredential(
  providerId: string,
  credId: string
): Promise<{ id: string; name: string }> {
  const response = await api.post<{ id: string; name: string }>(`/providers/${providerId}/credentials/${credId}/reveal`);
  return response.data;
}

// Models API
export async function apiGetModels(
  providerId: string,
  params?: { page?: number; limit?: number; search?: string }
): Promise<PaginatedResult<ApiModel>> {
  const response = await api.get<PaginatedResult<ApiModel>>(`/providers/${providerId}/models`, { params });
  return response.data;
}

export async function apiCreateModel(providerId: string, data: Partial<ApiModel>): Promise<ApiModel> {
  const response = await api.post<ApiModel>(`/providers/${providerId}/models`, data);
  return response.data;
}

export async function apiUpdateModel(providerId: string, modelId: string, data: Partial<ApiModel>): Promise<ApiModel> {
  const response = await api.put<ApiModel>(`/providers/${providerId}/models/${modelId}`, data);
  return response.data;
}

export async function apiDeleteModel(providerId: string, modelId: string): Promise<void> {
  await api.delete(`/providers/${providerId}/models/${modelId}`);
}

// Gateway API Keys
export async function apiGetGatewayKeys(
  params?: { page?: number; limit?: number; search?: string }
): Promise<PaginatedResult<ApiGatewayKey>> {
  const response = await api.get<PaginatedResult<ApiGatewayKey>>('/gateway-keys', { params });
  return response.data;
}

export async function apiCreateGatewayKey(data: {
  name: string;
  providerId: string;
  rateLimit?: number;
  allowedModels?: string[];
  expiresInDays?: number;
}): Promise<ApiGatewayKey> {
  const response = await api.post<ApiGatewayKey>('/gateway-keys', data);
  return response.data;
}

export async function apiDeleteGatewayKey(id: string): Promise<void> {
  await api.delete(`/gateway-keys/${id}`);
}

// Request Logs API
export async function apiGetLogs(params?: {
  provider?: string;
  model?: string;
  status?: number;
  search?: string;
  limit?: number;
  offset?: number;
  page?: number;
}): Promise<PaginatedResult<ApiRequestLog>> {
  const response = await api.get<PaginatedResult<ApiRequestLog>>('/logs', { params });
  return response.data;
}

// Settings API
export async function apiGetSettings(): Promise<{ value: ApiSetting[] }> {
  const response = await api.get<{ value: ApiSetting[] }>('/settings');
  return response.data;
}

export async function apiUpdateSettings(settings: Record<string, string>): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>('/settings', { settings });
  return response.data;
}

// Health Check API
export interface ApiHealthResponse {
  status: string;
  database: string;
  redis: string;
}

export async function apiGetHealth(): Promise<ApiHealthResponse> {
  const response = await api.get<ApiHealthResponse>('/health');
  return response.data;
}
