# Repository Guidelines

## Project Structure & Module Organization
This is a `pnpm` + Turborepo monorepo.

- `apps/extension`: WXT-based browser extension (main product). Key folders: `components/`, `hooks/`, `lib/`, `entrypoints/`, `locales/`.
- `apps/web`: Next.js product/marketing site.
- `packages/*`: Shared libraries (`ui`, `types`, `utils`, `ai`, `db`, `storage`, `parser`, `i18n`, `api`).
- `docs/`: Product docs, design notes, and screenshots.

Use workspace boundaries: app code stays in `apps/*`; reusable logic belongs in `packages/*`.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies (Node 18+, pnpm 9).
- `pnpm dev`: run all dev tasks through Turbo.
- `pnpm dev:extension` / `pnpm dev:ext-firefox` / `pnpm dev:ext-edge`: extension dev by browser target.
- `pnpm dev:web`: run the Next.js site locally.
- `pnpm build`: build all workspaces.
- `pnpm build:extension`, `pnpm build:web`, `pnpm build:packages`: targeted builds.
- `pnpm zip:extension`: package extension zip artifacts for all supported browsers.
- `pnpm lint`: run Turbo lint tasks (currently blocked by `apps/web` using `next lint` with Next 16 CLI changes).
- `pnpm -r run test --if-present`: run tests in packages that define them (currently no workspace test scripts).

## Coding Style & Naming Conventions
- Language: strict TypeScript (`tsconfig.json` has `"strict": true`).
- Use React function components and typed props/interfaces.
- Formatting/linting: no workspace Prettier config is committed; keep style consistent with surrounding files and run lint where available.
- Naming patterns:
  - Components: `PascalCase.tsx` (example: `MainContent.tsx`).
  - Hooks: `useXxx.ts` (example: `useBookmarkSearch.ts`).
  - Shared UI primitives in `packages/ui` follow shadcn-style kebab-case filenames (example: `button.tsx`).
- Use path aliases where configured: `@/*`, `@ui/*`.

## Testing Guidelines
- There is currently no enforced workspace-wide test runner or coverage threshold.
- Existing test files follow `__tests__/*.test.ts` (example: `apps/extension/lib/ai/__tests__/cache.test.ts`).
- For new logic, add focused unit tests with the same naming convention and include manual verification steps in PRs (Chrome/Firefox/Edge for extension-related changes).

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat(scope): summary`, `fix: summary`, `perf: summary`, etc.
- Keep commits atomic and scoped to one concern.
- Prefer clear imperative summaries; Chinese or English is acceptable; avoid emojis.
- PRs should include:
  - What changed and why.
  - Linked issue(s).
  - How it was tested (commands + browsers).
  - Screenshots/GIFs for UI changes (`apps/extension` or `apps/web`).

## Security & Configuration Tips
- Never commit API keys or local secrets; use local env files.
- Validate privacy-related changes carefully (data is expected to stay local by default).

## Agent-Specific Instructions
- Default to Chinese in user-facing replies (简体中文), unless the requester explicitly asks for another language.
