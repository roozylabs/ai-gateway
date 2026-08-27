/**
 * Strict UI and Domain Type Definitions for RoozyLabs Prism
 * Enforces strong literal union types across React state and API parameters.
 */

export type ProviderFilterId = 'all' | string;
export type RoutingPolicyType = 'balanced' | 'quality' | 'cheap' | 'fast';
export type TargetModelOption = 'prism-auto' | string;
export type GatewayKeyPrefixOption = 'auto' | string;
export type AgentIdentityOption = 'default' | string;

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'rose';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data?: T;
  error?: string;
}

export type PrimitiveValue = string | number | boolean | null;
export type JsonValue = PrimitiveValue | { [key: string]: JsonValue } | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type AppError = Error | { message: string } | string;

/**
 * Safely extracts error message from caught Error or error objects
 */
export function getErrorMessage(err: AppError | unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'An unexpected error occurred';
}
