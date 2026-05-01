# EasyPod / PodoFlow - AI Assistant Guidelines

## 1. Project Overview
- **Name:** EasyPod / PodoFlow (Centro Podológico G&C)
- **Type:** Multi-tenant SaaS for Podiatry Clinics.
- **Core Architecture:** React 19 + Vite + TypeScript + Supabase + Clerk.
- **Styling:** Tailwind CSS (Mobile-First, Modern UI, Premium aesthetics).
- **State Management:** Zustand + React Hook Form (with Zod).

## 2. Multi-tenant Architecture (CRITICAL)
- **Rule:** ALL database queries (select, insert, update) MUST include or filter by `sucursal_id`.
- **Global Store:** Use `useBranchStore` from `src/stores/branchStore.ts` to get `sucursalActiva`.
- **Example:**
  ```typescript
  const { sucursalActiva } = useBranchStore();
  // Wrong: supabase.from('citas').select('*');
  // Correct: supabase.from('citas').select('*').eq('sucursal_id', sucursalActiva.id);
  ```

## 3. UI/UX and Styling Rules
- **Framework:** Tailwind CSS. Do NOT use inline styles.
- **Responsiveness:** ALWAYS use a mobile-first approach. Default classes are for mobile. Use `sm:`, `md:`, `lg:` for larger screens.
  - *Example:* `<div className="flex flex-col md:flex-row p-4 md:p-6">`
- **Aesthetics:** Use premium, vibrant styling. Dark mode/glassmorphism where requested. Rounded corners (`rounded-xl`, `rounded-2xl`, `rounded-[2.5rem]`). Drop shadows (`shadow-sm`, `shadow-[0_8px_30px_rgb(0,0,0,0.02)]`).
- **Icons:** Use `lucide-react`.

## 4. Coding Conventions
- **Language:** TypeScript. Use strict typing for Supabase responses and Component Props.
- **Components:** Functional components with hooks. Maximize reusability.
- **Date Handling:** Use `date-fns` with `es` locale for all date formatting.
- **Notifications:** Use `react-hot-toast` for success/error feedback.

## 5. Security & Auth
- **Auth Provider:** Clerk.
- **Protected Routes:** Use `<AuthGuard>` and Clerk components (`<SignedIn>`, `<SignedOut>`).
- **Supabase Policies:** Data is secured by RLS in Supabase. The front-end must still pass `sucursal_id` for accurate querying.

## 6. Pre-Commit / Build Checks
- Run `npm run build` locally to verify TypeScript (`tsc`) and Vite build before committing.
- Do not leave unused imports or variables (ESLint strict).
