# Strict Type Policy: Prohibition of Loose `unknown` Types

This rule governs type definitions across all TypeScript files in `apps/app` and the repository.

## Directives

### 1. Avoid Loose `unknown` as a Lazy Type Fallback
- **DO NOT** use `unknown` for data schemas, parameters, or mutation payloads where structured types exist:
  - **Bad**:
    ```typescript
    args: Record<string, unknown>
    result: unknown
    payload: unknown
    ```
- **Mandatory Requirements**:
  - Use concrete domain interfaces or strongly-typed JSON primitives defined in `@/types/ui`:
    ```typescript
    export type PrimitiveValue = string | number | boolean | null;
    export type JsonValue = PrimitiveValue | { [key: string]: JsonValue } | JsonValue[];
    export type JsonObject = { [key: string]: JsonValue };
    ```
  - For tool arguments, schemas, and payload objects, use `JsonObject` or `Record<string, JsonValue>`.

### 2. Error Catching & Narrowing
- For caught error parameters in `try/catch` blocks:
  - **Bad**:
    ```typescript
    } catch (err: unknown) {
      toast.error(err.message); // Type error
    }
    ```
  - **Good**:
    ```typescript
    } catch (err: Error | unknown) {
      toast.error(getErrorMessage(err));
    }
    ```
  - Ensure `getErrorMessage` handles `Error`, `string`, and `{ message: string }` without leaking `unknown` into callers.
