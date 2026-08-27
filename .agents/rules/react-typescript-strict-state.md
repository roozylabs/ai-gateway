# Strict React & TypeScript State Typing Guidelines

Inspired by skills from **skills.sh** (`typescript-advanced-types`, `vercel-react-best-practices`, `react-typescript`).

This rule enforces strict type-safety across React states, API handlers, event handlers, and component props in `apps/app`.

## Directives

### 1. Mandatory Explicit Generic Typing for `useState`
- **Never rely on implicit string inference for state selectors or filters.**
- **Bad**: `const [selectedProviderId, setSelectedProviderId] = useState('all');` (infers broad `string`)
- **Good**:
  ```typescript
  export type ProviderFilterId = 'all' | string;
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderFilterId>('all');
  ```
- **Good**:
  ```typescript
  export type TargetModelOption = 'prism-auto' | string;
  export type RoutingPolicyType = 'balanced' | 'quality' | 'cheap' | 'fast';
  const [selectedModel, setSelectedModel] = useState<TargetModelOption>('prism-auto');
  const [selectedRoutingPolicy, setSelectedRoutingPolicy] = useState<RoutingPolicyType>('balanced');
  ```

### 2. Discriminated Unions for Complex UI States
- Avoid multiple loosely coupled booleans (`isLoading`, `isError`, `data`).
- Use discriminated union states where applicable:
  ```typescript
  export type AsyncState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: string };
  ```

### 3. Strict Event & Error Narrowing (Zero `any`)
- Never use `catch (err: any)`. Use `catch (err: unknown)` with runtime type guard or `(err as Error).message`.
- Event handlers must use explicit React event types (e.g. `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`).

### 4. No Unsafe Type Assertions (`as any`)
- Do not cast values with `as any`. Use discriminated union types or Zod / runtime validation interfaces instead.
