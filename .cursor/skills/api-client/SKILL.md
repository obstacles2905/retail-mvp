# Skill: API Client Integration & Data Fetching

**Context:** The project is already ongoing. We have an established Next.js App Router frontend and a NestJS backend.
**Purpose:** Ensure all NEW API integrations follow existing patterns and maintain strict type safety.

## Strict Guidelines for Adding New API Calls

1. **Reuse Existing Infrastructure:**
   - DO NOT create a new `fetch` or `axios` wrapper. Find and use the existing configured API client (e.g., in `src/lib/api` or `src/lib/fetcher`).
   - The existing client already handles JWT injection and base URLs. Do not reinvent authentication for new requests.

2. **Strict Typing (Front-to-Back Sync):**
   - Every new API request must have strongly typed Request and Response interfaces.
   - Look at the NestJS DTOs for the new feature and perfectly mirror them in the frontend TypeScript interfaces.

3. **Server vs. Client Fetching:**
   - For new read-only pages/dashboards: Prioritize fetching data in React Server Components (RSC) directly.
   - For mutations (POST, PATCH, DELETE) or highly interactive client components: Use the existing API client within form submission handlers or Server Actions.

4. **Error Handling:**
   - Always wrap mutations in `try/catch`.
   - Use the existing toast notification system (shadcn `useToast`) to display success or error messages derived from the backend's HTTP exceptions.