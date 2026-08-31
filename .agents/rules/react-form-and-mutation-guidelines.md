# React Form State & React Query Guidelines

This rule strictly governs form handling, data fetching, and API mutations across all Next.js React pages and components in `apps/app`.

## Directives

### 1. Prohibition of Scattered Primitive Form States
- **STRICTLY FORBIDDEN**: Declaring separate individual `useState` hooks for each form input field:
  - **Bad**:
    ```typescript
    const [formName, setFormName] = useState('');
    const [formDisplayName, setFormDisplayName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formEnabled, setFormEnabled] = useState(true);
    ```
- **Mandatory Requirements**:
  - **Option A (Preferred for Forms)**: Use **React Hook Form (`useForm`)** + Zod schema validation + Radix `<Form>` components (`@/components/molecules/Form`).
  - **Option B (Simple State Objects)**: Wrap state in a single strongly-typed object:
    ```typescript
    interface FormState {
      name: string;
      displayName: string;
      description: string;
      enabled: boolean;
    }
    const [formData, setFormData] = useState<FormState>(initialFormState);
    ```

### 2. Mandatory Encapsulation in `@/hooks/queries` and `@/hooks/mutations`
- **STRICTLY FORBIDDEN**: Calling raw API functions (`apiGet*`, `apiCreate*`, `apiUpdate*`, `apiDelete*`, `apiComplete*`) or raw `fetch`/`axios` directly inside page or component files.
- **STRICTLY FORBIDDEN**: Inlining raw `useQuery({ queryKey: ... })` or `useMutation({ mutationFn: ... })` directly inside page or component files.
- **Mandatory Architecture**:
  - **All Data Fetching (`GET`)**: Must be encapsulated inside dedicated custom query hooks under `apps/app/hooks/queries/` (e.g. `useAgentsQuery`, `useUserPermissionsQuery`, `useToolsQuery`).
  - **All API Mutations (`POST`, `PUT`, `PATCH`, `DELETE`)**: Must be encapsulated inside dedicated custom mutation hooks under `apps/app/hooks/mutations/` (e.g. `useOnboardingMutation`, `useAgentMutations`, `useMemberMutations`).
  - Pages and components must **ONLY** import and consume the custom hooks from `@/hooks/queries` and `@/hooks/mutations`.
  - Pages and components may only import **TypeScript interfaces/types** (e.g. `import type { ApiModel } from '@/lib/api'`) from `@/lib/api`.

### 3. Loading, Pending, and Error State Handling
- Always use `isPending`, `isLoading`, `isError`, and `error` provided by the custom React Query hooks.
- Handle mutations via `mutateAsync` or `mutate` with standard error parsing (`parseApiError(err)`) and toast notifications (`toast.error(apiErr.message)`).
- Never maintain manual boolean loading states (`const [loading, setLoading] = useState(false)`) when `useMutation` / `useQuery` already provides `isPending` / `isLoading`.

