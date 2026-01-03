# Frontend Code Review Guidelines

When reviewing changes to the **SvelteKit frontend** in `apps/mentora/src/`:

## ✅ Required Checks

1. **Svelte 5 Runes**
    - Use `$state()`, `$derived()`, `$effect()` for reactive state
    - No legacy `$:` reactive statements or Svelte stores in new code
    - Event handlers use `onevent={handler}` syntax (not `on:event`)

2. **Component Structure**
    - Props use `let { prop = $bindable() }: Props = $props()`
    - Export types for component props when non-trivial
    - Keep components focused; extract logic into `$lib` utilities

3. **SSR & Cloudflare Compatibility**
    - Guard browser-only code with `if (browser)` or `onMount`
    - No top-level `window`/`document` access
    - Dynamic import Firebase Auth/Analytics modules

4. **Data Loading**
    - Use `+page.ts`/`+layout.ts` load functions for data fetching
    - Return typed data via generated `$types` definitions
    - Avoid fetching in components when load functions suffice

5. **Styling**
    - Use Tailwind 4 utility classes from `app.css` theme
    - Reuse Flowbite components; don't duplicate markup
    - Use logical properties for RTL support where possible

6. **Accessibility**
    - Interactive elements must have accessible names
    - Use semantic HTML (`<button>`, `<nav>`, `<main>`)
    - Ensure keyboard navigation works

## ⚠️ Common Issues

- **Client-only imports at top level**: Causes SSR failures on Cloudflare
- **Missing loading states**: Always handle pending/error states
- **Hardcoded strings**: All user-facing text must use i18n (see `i18n.md`)

## 🔗 Related Files

- Theme tokens: `apps/mentora/src/app.css`
- Shared components: `apps/mentora/src/lib/components/`
- Route handlers: `apps/mentora/src/routes/`
