# Documentation Revision History Rule

Whenever you make any changes, additions, or modifications to files inside the `docs/` directory, you **MUST** update the "Revision History" (or "Changelog") table in the document.

1.  Check for a `## Revision History` section (usually near the top, after the main title or metadata).
    If it doesn't exist, create it using this format:
    ```markdown
    ## Revision History

    | Version | Date & Time | Description of Changes |
    | :--- | :--- | :--- |
    | 1.0 | [Initial Date] | Initial creation |
    ```
2.  When updating the document, append a new row to the table with:
    - Incremented version number (e.g., from 1.0 to 1.1)
    - Current Date & Time (e.g., `19 August 2026, 11:05 WIB`)
    - Brief description of what was changed
3.  Do NOT just overwrite a single date field; maintain the history log.
