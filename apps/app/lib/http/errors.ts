export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'CREDENTIAL_EXHAUSTED'
  | 'BUDGET_EXCEEDED'
  | 'TENANT_SECURITY_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly requestId?: string;
  public readonly details?: ApiErrorDetail[];
  public readonly retryable: boolean;

  constructor(params: {
    message: string;
    code?: ApiErrorCode;
    status?: number;
    requestId?: string;
    details?: ApiErrorDetail[];
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code || 'INTERNAL_ERROR';
    this.status = params.status || 500;
    this.requestId = params.requestId;
    this.details = params.details;
    this.retryable = params.retryable ?? (this.status >= 500 || this.status === 429);

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function parseApiError(error: unknown, defaultMessage = 'An unexpected API error occurred'): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const errObj = error as {
      status?: number;
      response?: {
        status?: number;
        data?: {
          error?: {
            message?: string;
            type?: string;
            code?: string;
            details?: ApiErrorDetail[];
          };
          message?: string;
        };
        headers?: Record<string, string>;
      };
    };

    const status = errObj.status || errObj.response?.status || 500;
    const errPayload = errObj.response?.data?.error;
    const message = errPayload?.message || errObj.response?.data?.message || defaultMessage;
    const requestId = errObj.response?.headers?.['x-request-id'];

    let code: ApiErrorCode = 'INTERNAL_ERROR';
    if (status === 401) code = 'AUTH_REQUIRED';
    else if (status === 403) code = 'FORBIDDEN';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status === 422 || status === 400) code = 'VALIDATION_ERROR';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status >= 500) code = 'INTERNAL_ERROR';

    return new ApiError({
      message,
      code,
      status,
      requestId,
      details: errPayload?.details,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      message: error.message,
      code: 'INTERNAL_ERROR',
      status: 500,
    });
  }

  return new ApiError({
    message: defaultMessage,
    code: 'INTERNAL_ERROR',
    status: 500,
  });
}
