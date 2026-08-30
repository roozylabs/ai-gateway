export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  image?: string;
  role?: string;
  orgId?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  turnstileToken?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiUserPermissionsResponse {
  userId: string;
  organizationId: string;
  roleSlug: string;
  isOnboarded: boolean;
  primaryRole: string;
  permissions: string[];
}

export interface ApiCompleteOnboardingRequest {
  organizationName: string;
  workspaceName?: string;
  gatewayKeyName?: string;
  initialProvider?: string;
  initialApiKey?: string;
}

export interface ApiCompleteOnboardingResponse {
  success: boolean;
  message?: string;
  apiKey?: string;
}
