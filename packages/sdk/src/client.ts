import {
  APIError,
  AuthenticationError,
  PrismClientOptions,
  RateLimitError,
} from "./types.js";

export class HttpClient {
  private baseURL: string;
  private apiKey?: string;
  private orgId?: string;
  private workspaceId?: string;
  private projectId?: string;
  private agentId?: string;
  private timeout: number;
  private maxRetries: number;
  private customFetch: typeof fetch;

  constructor(options: PrismClientOptions = {}) {
    this.baseURL = (options.baseURL || "http://localhost:8080").replace(/\/$/, "");
    this.apiKey = options.apiKey || (typeof process !== "undefined" ? process.env.PRISM_API_KEY : undefined);
    this.orgId = options.orgId || (typeof process !== "undefined" ? process.env.PRISM_ORG_ID : undefined);
    this.workspaceId = options.workspaceId || (typeof process !== "undefined" ? process.env.PRISM_WORKSPACE_ID : undefined);
    this.projectId = options.projectId || (typeof process !== "undefined" ? process.env.PRISM_PROJECT_ID : undefined);
    this.agentId = options.agentId || (typeof process !== "undefined" ? process.env.PRISM_AGENT_ID : undefined);
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 2;
    this.customFetch = options.fetch || globalThis.fetch;
  }

  public getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    if (this.orgId) {
      headers["X-Prism-Org-ID"] = this.orgId;
    }
    if (this.workspaceId) {
      headers["X-Prism-Workspace-ID"] = this.workspaceId;
    }
    if (this.projectId) {
      headers["X-Prism-Project-ID"] = this.projectId;
    }
    if (this.agentId) {
      headers["X-Prism-Agent-ID"] = this.agentId;
    }

    return headers;
  }

  public async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      query?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    const method = options.method || "GET";
    let url = `${this.baseURL}${path.startsWith("/") ? path : `/${path}`}`;

    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const res = await this.customFetch(url, {
          method,
          headers: this.getHeaders(options.headers),
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let errorMessage = res.statusText;
          let errorCode: string | undefined;

          try {
            const errorJson = (await res.json()) as { error?: { message?: string; code?: string } | string };
            if (typeof errorJson.error === "string") {
              errorMessage = errorJson.error;
            } else if (errorJson.error?.message) {
              errorMessage = errorJson.error.message;
              errorCode = errorJson.error.code;
            }
          } catch {
            // Ignore json parse error for non-200 responses
          }

          if (res.status === 401) {
            throw new AuthenticationError(errorMessage);
          }
          if (res.status === 429) {
            if (attempt <= this.maxRetries) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
              continue;
            }
            throw new RateLimitError(errorMessage);
          }

          throw new APIError(res.status, errorMessage, errorCode);
        }

        if (res.status === 204) {
          return {} as T;
        }

        return (await res.json()) as T;
      } catch (err) {
        if (err instanceof APIError) {
          throw err;
        }
        if (attempt > this.maxRetries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }

    throw new APIError(500, "Request failed after retries");
  }

  public async fetchRaw(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<Response> {
    const url = `${this.baseURL}${path.startsWith("/") ? path : `/${path}`}`;
    return this.customFetch(url, {
      method: options.method || "POST",
      headers: this.getHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }
}

