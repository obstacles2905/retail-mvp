# Skill: Prisma Schema Modeling & Extension

**Context:** The database is already alive, and migrations have been applied. We are adding NEW models or relations to an existing `schema.prisma`.
**Purpose:** Ensure safe database evolution without breaking existing queries or data integrity.

## Strict Guidelines for Extending the Database

1. **Non-Destructive Changes:**
   - DO NOT rename or delete existing core columns in `User`, `SKU`, `Offer`, or `OfferHistory` unless explicitly instructed to perform a breaking migration.
   - When adding new columns to existing populated tables, make them optional (`?`) OR provide a `@default()` value to prevent migration failures.

2. **Relational Integrity:**
   - When adding a new model (e.g., `Category`, `CompanyProfile`), ensure clear 1:1, 1:n, or m:n relationships with explicit relation scalars (e.g., `categoryId Int`).
   - Configure referential actions carefully (e.g., `onDelete: SetNull` vs `onDelete: Cascade`). Think about what happens to an Offer if a related entity is deleted.

3. **Naming Conventions:**
   - Keep model names singular (e.g., `Company`, not `Companies`).
   - Keep relational fields clear (e.g., `author_id` mapping to `fields: [author_id], references: [id]`).

4. **Migration Workflow:**
   - After updating `schema.prisma`, DO NOT run migrations automatically.
   - Output the suggested Prisma schema changes and wait for the user to review and run `npx prisma migrate dev` manually.