import { api } from './client';
import {
  User,
  LoginRequest,
  LoginResponse,
  ApiUserPermissionsResponse,
  ApiCompleteOnboardingRequest,
  ApiCompleteOnboardingResponse,
} from './types/auth';

export async function apiLogin(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', data);
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

export async function apiGetUserPermissions(): Promise<ApiUserPermissionsResponse> {
  const response = await api.get<ApiUserPermissionsResponse>('/user/permissions');
  return response.data;
}

export async function apiCompleteOnboarding(data: ApiCompleteOnboardingRequest): Promise<ApiCompleteOnboardingResponse> {
  const response = await api.post<ApiCompleteOnboardingResponse>('/onboarding', data);
  return response.data;
}

export async function apiGetTurnstileConfig(): Promise<{ siteKey: string }> {
  try {
    const response = await api.get<{ siteKey: string }>('/auth/turnstile-config');
    return response.data;
  } catch {
    return { siteKey: process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY || '1x00000000000000000000AA' };
  }
}
