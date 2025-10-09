# Mentora Copilot Instructions

## 🧠 Project overview

- Monorepo managed with **pnpm workspaces** (`pnpm-workspace.yaml`). Use `pnpm install` at the repository root and filter scripts (e.g. `pnpm --filter mentora dev`).
- Frontend app lives in `apps/mentora` and is built with **SvelteKit 2** + **Svelte 5 runes**, compiled via **Vite 7** and deployed with `@sveltejs/adapter-cloudflare`.
- Styling uses **Tailwind CSS 4** with Flowbite-Svelte components (see `src/app.css` for theme tokens), and `@lucide/svelte` icons.
- Internationalization is handled by **@inlang/paraglide-js**. Generated runtime lives in `src/lib/paraglide/**`; treat those files as generated artifacts.
- Shared Firebase utilities live in `packages/firebase`, bundled with **tsup** and published into the workspace as `mentora-firebase`.

## ✅ Core workflows

- **Formatting:** `pnpm format` (Prettier + Tailwind + Svelte plugins). Respect `.gitignore` and generated folders.
- **Static analysis:** run `pnpm --filter mentora check` (SvelteKit sync + svelte-check) and `pnpm --filter mentora lint` (ESLint 9 + flat config) before committing UI changes.
- **Firebase package:** build with `pnpm --filter mentora-firebase build`; deploy indexes/rules via `pnpm --filter mentora-firebase deploy` (requires `FIREBASE_PROJECT_ID`).

## 🧱 Coding guidelines

1. **Svelte files**
    - Prefer Svelte 5 runes (`const title = $state("...")`) when stateful logic is needed; do not use stores and no legacy `$:` reactivity for new code.
    - Event handlers are just like any other attribute or prop, `on:event={handler}` has been deprecated, use `onevent={handler}` instead. (without `:`)
    - Use `+page.ts/+layout.ts` load functions for data fetching. Return typed data via generated `$types` definitions.
    - Guard client-only dependencies (Firebase Auth/Analytics, window/document access) with `if (browser)` or dynamic imports to keep SSR/Cloudflare workers happy.
    - Do not mutate the generated Paraglide middleware—extend via hooks or utility wrappers instead.

2. **Styling (Tailwind 4)**
    - Add design tokens in `@theme` within `app.css`; avoid reintroducing deprecated `tailwind.config.{cjs,js}` files.
    - Use logical properties (`p-inline`, `m-block`) where possible to improve RTL support.
    - Flowbite components expect the `@plugin 'flowbite/plugin';` directive already configured—reuse helper classes rather than duplicating component markup.

3. **Internationalization**
    - Never edit files inside `src/lib/paraglide/messages/**` manually. Update source translations in `apps/mentora/messages/{locale}.json` and run `pnpm --filter mentora run prepare` (`svelte-kit sync`) to regenerate.
    - Import messages via `import { m } from "$lib/paraglide/messages"` and record message usage through the provided helpers to keep locale extraction accurate.

4. **Firebase utilities**
    - Rely on the modular SDK (`firebase/*`) already in use. **Do not pull in `firebase/compat` namespaces**—they are deprecated and bloat Cloudflare bundles.
    - When extending Firestore access, compose paths with `joinPath` and validate payloads with the exported Zod schemas (`packages/firebase/src/firestore`).
    - Always run `zod` validation before writing to Firestore to keep type contracts in sync.
    - Wrap analytics/auth calls in browser guards; `getAnalytics` will throw in SSR.

## 🚫 Deprecated & risky APIs to avoid

- **Firebase:** Avoid `firebase.firestore()`, `firebase.auth()`, `onSnapshot` with deprecated options, and any `compat` imports—they are removed in v12 tree-shaking builds.
- **SvelteKit:** Legacy `page.store`/`session` APIs are removed; use the new `event.locals` pattern and typed hooks.
- **Tailwind:** The `@tailwind base/components/utilities` directives are obsolete in v4; stick to the new single `@import "tailwindcss"` entrypoint and `@layer` blocks.
- **Paraglide:** Avoid manual `setLocale` mutations outside provided helpers; use `overwriteSetLocale` only in `hooks` if absolutely necessary.

## 🧪 Testing & verification

- For data contracts, add schema assertions in `packages/firebase` rather than duplicating inline type guards.
- Before opening PRs, run:
    1. `pnpm install`
    2. `pnpm --filter mentora check`
    3. `pnpm --filter mentora lint`
    4. `pnpm --filter mentora-firebase build`

## 📁 File hygiene

- Generated folders: `.svelte-kit/`, `apps/mentora/src/lib/paraglide/**`, `apps/mentora/project.inlang/cache/**`, and `packages/firebase/dist/**` should not be committed or edited manually.
- Keep shared UI primitives under `apps/mentora/src/lib`; expose new utilities through `index.ts` for consistent imports (`$lib/...`).
- Favor TypeScript path aliases defined in `tsconfig.json` (`$lib`, `$lib/paraglide`, etc.) over relative `../../` chains.
