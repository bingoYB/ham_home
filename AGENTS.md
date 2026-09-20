# Repository Guidelines

This is a pnpm + Turborepo monorepo for HamHome - 智能书签管理工具.

## Project Structure

```
apps/
  extension/   # WXT-based browser extension (main product)
  web/         # Next.js product/marketing site
packages/*    # Shared libraries (agent, ui, ui-business, types, utils, db, storage, parser, i18n, api)
docs/         # Product docs, design notes
```

Use workspace boundaries: app code stays in `apps/*`; reusable logic belongs in `packages/*`.

---

## Build, Test, and Development Commands

### Install & Setup
- `pnpm install` - Install workspace dependencies (Node 18+, pnpm 9)

### Development
- `pnpm dev` - Run all dev tasks through Turbo
- `pnpm dev:extension` - Run extension dev (Chrome)
  - Preset AI keys / WebDAV etc. for dev profiles: copy `apps/extension/.env.example` to `.env.local`
    (see `apps/extension/docs/dev-config-preset.md`)
- `pnpm dev:ext-firefox` - Run extension dev for Firefox
- `pnpm dev:ext-edge` - Run extension dev for Edge
- `pnpm dev:web` - Run Next.js site locally

### Build
- `pnpm build` - Build all workspaces
- `pnpm build:extension` - Build extension for all browsers
- `pnpm build:web` - Build Next.js site
- `pnpm build:packages` - Build all packages

### Package & Release
- `pnpm zip:extension` - Package extension zip for all browsers
- `pnpm submit:extension` - Submit extension to stores
- `pnpm submit:init` - Initialize submission

### Linting & Type Checking
- `pnpm lint` - Run Turbo lint tasks (may be blocked by Next 16 CLI issues)
- `pnpm -r run lint` - Run lint in all packages
- `pnpm -r run typecheck` - Run type check in all packages

### Testing
- Tests follow pattern: `__tests__/*.test.ts`
- Example test file: `apps/extension/lib/ai/__tests__/cache.test.ts`
- Run all tests: `pnpm -r run test --if-present`
- Run single test file: Use vitest directly in the package, e.g., `pnpm --filter @hamhome/ai test` or `npx vitest run path/to/test.test.ts`

### Clean
- `pnpm clean` - Clean all workspaces (removes node_modules, .wxt, .output, dist)

---

## Code Style Guidelines

### Language & Configuration
- Strict TypeScript: `tsconfig.json` has `"strict": true`
- React 19 with function components only
- Use typed props/interfaces for all components

### Naming Conventions
- Components: `PascalCase.tsx` (e.g., `MainContent.tsx`)
- Hooks: `useXxx.ts` (e.g., `useBookmarkSearch.ts`)
- Shared UI primitives: kebab-case (e.g., `button.tsx`)
- Services: `XxxService.ts` or `useXxxService.ts`
- Utils: `xxx.utils.ts`

### Imports & Path Aliases
- Use configured path aliases: `@/*`, `@ui/*`, `@hamhome/*`
- Order imports: external → internal → relative
- Prefer path aliases over relative paths where available

### Component Rules
- Props MUST be explicitly typed (interface or type)
- Components should be primarily presentational
- Components MUST NOT call APIs directly or contain business logic
- Keep components under 150 lines
- Complex JSX logic should be extracted to smaller components

### Hook Rules
- Hooks handle business logic, state, and side effects
- Hooks MUST NOT return arrays; return objects only
- One hook = one business responsibility
- Hooks MUST NOT render JSX
- Hooks should be reusable and independent from specific UI

### Service / Data Layer Rules
- All network/IO operations MUST be in service modules
- No fetch/axios calls inside components or hooks
- URLs and endpoints must not be hard-coded in components
- Services must expose clear, typed methods

### Utility Rules
- Utility functions must be pure
- No React imports in utils
- No side effects or external state access

### Content Script UI (Browser Extension)
- All Portal logic in content scripts MUST use `useContentUI()` hook
- Pattern: `const { container: portalContainer } = useContentUI()`

---

## Architecture Principles

### Core Principles
- Design abstractions BEFORE writing implementation
- Prefer composition over duplication
- Enforce single-responsibility at file and component level
- Optimize for long-term maintainability

### Abstraction Rules (MANDATORY)
- If logic may be reused in 2+ places, it MUST be abstracted
- Reusable logic goes to: Custom Hooks, Utility functions, or Shared components
- Never duplicate logic across files

### File Organization
- Organize code by domain (feature-based structure)
- Page-level components only compose existing components and hooks
- Do NOT mix UI, logic, and data fetching in a single file

---

## Documentation Rules

### Documentation Sync (MANDATORY)
- Documentation MUST be scoped to the package where the code lives
- Update `<package-root>/docs/components.md` when:
  - Creating a new component
  - Changing component API (props, events, slots)
  - Modifying component behavior
- Each component section MUST include: name, description, props table, usage example
- Do NOT update root-level `/docs` unless explicitly requested

---

## Testing Guidelines
- No enforced workspace-wide test runner or coverage threshold
- Follow `__tests__/*.test.ts` naming convention
- For new logic, add focused unit tests
- Include manual verification steps in PRs (Chrome/Firefox/Edge for extension changes)

---

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat(scope): summary`, `fix: summary`, `perf: summary`
- Keep commits atomic and scoped
- Use Chinese or English; avoid emojis
- PR description should include: what/why, linked issues, test commands+browsers, screenshots for UI

---

## Security
- Never commit API keys or local secrets; use local env files
- Validate privacy-related changes (data stays local by default)