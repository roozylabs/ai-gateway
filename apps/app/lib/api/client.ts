import axios from 'axios';
import Cookies from 'js-cookie';
import { parseApiError } from '@/lib/http/errors';
import { useTenantStore } from '@/stores/useTenantStore';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Axios request interceptor to attach auth token and tenant headers
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach active tenant context from user session / tenant store
  try {
    const tenantState = useTenantStore.getState();
    const orgId = tenantState.selectedOrgId || (typeof window !== 'undefined' ? localStorage.getItem('org_id') : null);
    const wsId = tenantState.selectedWorkspaceId || (typeof window !== 'undefined' ? localStorage.getItem('workspace_id') : null);

    if (orgId) {
      config.headers['X-Prism-Org-ID'] = orgId;
    }
    if (wsId) {
      config.headers['X-Prism-Workspace-ID'] = wsId;
    }
  } catch {
    // Ignore during SSR or if storage is inaccessible
  }

  return config;
});

// Axios response interceptor for unified error parsing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
    }
    const apiError = parseApiError(error);
    return Promise.reject(apiError);
  }
);
