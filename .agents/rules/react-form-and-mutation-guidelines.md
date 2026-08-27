# React Form State & React Query Mutation Guidelines

This rule governs form handling and API mutations across all Next.js React pages and components in `apps/app`.

## Directives

### 1. Prohibition of Scattered Primitive Form States
- **DO NOT** declare separate individual `useState` hooks for each form input field:
  - **Bad**:
    ```typescript
    const [formName, setFormName] = useState('');
    const [formDisplayName, setFormDisplayName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formEnabled, setFormEnabled] = useState(true);
    ```
- **Mandatory Alternatives**:
  - **Option A**: Use **React Hook Form (`useForm`)** + Radix `<Form>` components (`@/components/molecules/Form`).
  - **Option B**: Wrap form values in a single strongly-typed object state:
    ```typescript
    interface FormState {
      name: string;
      displayName: string;
      description: string;
      enabled: boolean;
    }
    const [formData, setFormData] = useState<FormState>(initialFormState);
    ```

### 2. Mandatory Use of React Query `useMutation` for API Writes & Executions
- **DO NOT** execute un-wrapped imperative async fetch/API calls directly inside component event handlers with manual loading booleans and `try/catch` blocks:
  - **Bad**:
    ```typescript
    const handleRunTest = async () => {
      setExecuting(true);
      try {
        const res = await apiTestTool(id, args);
        // ...
      } catch (err: unknown) { ... }
      finally { setExecuting(false); }
    };
    ```
- **Mandatory Requirement**:
  - Wrap all API write, test, execute, and reset operations in React Query **`useMutation`** hooks (or custom hooks in `@/hooks/queries`):
    ```typescript
    const testMutation = useMutation({
      mutationFn: (d: { id: string; args: Record<string, unknown> }) => apiTestTool(d.id, d.args),
      onSuccess: (res) => { ... },
      onError: (err: Error) => { ... },
    });
    ```
  - Utilize `testMutation.isPending`, `testMutation.mutateAsync()`, and automatic React Query cache invalidation (`queryClient.invalidateQueries`).
