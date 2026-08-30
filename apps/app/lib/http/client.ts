import Cookies from 'js-cookie';
import { parseApiError } from './errors';

export interface HttpClientOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get('auth_token') || null;
  }

  private getTenantHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const headers: Record<string, string> = {};
    const orgId = localStorage.getItem('org_id') || 'org_default';
    const workspaceId = localStorage.getItem('workspace_id') || 'ws_default';
    headers['X-Prism-Org-ID'] = orgId;
    headers['X-Prism-Workspace-ID'] = workspaceId;
    return headers;
  }

  public async fetch<T>(endpoint: string, options: HttpClientOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const token = this.getAuthToken();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...this.getTenantHeaders(),
      ...(customHeaders as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        throw parseApiError({
          status: response.status,
          response: {
            status: response.status,
            data: errorData,
            headers: {
              'x-request-id': response.headers.get('x-request-id') || requestId,
            },
          },
        });
      }

      if (response.status === 240 || response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      throw parseApiError(err);
    }
  }

  public get<T>(endpoint: string, options?: HttpClientOptions): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: HttpClientOptions): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: HttpClientOptions): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: HttpClientOptions): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: HttpClientOptions): Promise<T> {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient('/api');
