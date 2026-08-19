# Database Migrations Rule

Whenever creating or modifying database schema migrations inside `api/migrations/`, you **MUST ALWAYS** create both the `.up.sql` and `.down.sql` migration files together.

## Requirements

1. **Paired Migration Files**:
   - Every `NNN_<description>.up.sql` file MUST have a corresponding `NNN_<description>.down.sql` file with the exact same prefix number and description slug.

2. **Reversibility**:
   - The `.down.sql` file must contain clean, working SQL statements to safely rollback/revert all DDL or DML changes introduced in `.up.sql`.

3. **Sequential Naming**:
   - Migration file numbers must strictly follow the existing zero-padded sequential numbering format (e.g. `013_...`, `014_...`, `015_...`).
