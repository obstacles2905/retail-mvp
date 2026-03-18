# Skill: Forms & Validation (Zod + React Hook Form)

**Context:** The project has an established UI using Tailwind CSS, shadcn/ui, `react-hook-form`, and `zod`.
**Purpose:** Maintain a unified UX and code structure for all NEW forms and user inputs.

## Strict Guidelines for Building New Forms

1. **The Holy Trinity:** Every new form MUST use `react-hook-form`, `@hookform/resolvers/zod`, and shadcn/ui `<Form />` primitives. DO NOT use plain React state (`useState`) for form fields.

2. **Schema Definition:**
   - Define the `zod` schema in the same file as the component or in a dedicated `schemas.ts` file if shared.
   - Ensure `zod` validation matches the NestJS backend DTO validation (e.g., if backend requires `min(1)`, the zod schema must enforce it).

3. **Component Structure:**
   - Always use the `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, and `<FormMessage>` wrappers from shadcn.
   - Ensure proper accessible labeling.

4. **Handling Submission State:**
   - Always disable the submit button and show a loading indicator while `form.formState.isSubmitting` is true.
   - Do not manually manage loading states for forms; rely on RHF.

5. **Resetting:** - After a successful mutation (e.g., adding a new entity), gracefully reset the form using `form.reset()` and close the modal if applicable.