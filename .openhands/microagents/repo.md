Repository: AlexeyIgnatev/crypto-bank-admin

1) Purpose
- A demo admin panel for a bank/crypto platform built with Next.js. It presents a Russian-language dashboard with mock transactions, filters, and detail views. Simple cookie-based auth protects pages via middleware; credentials are demo-only (admin/admin) through API routes.

2) General Setup
- Stack: Next.js (App Router), React, TypeScript, Tailwind CSS (via @tailwindcss/postcss), ESLint.
- Key scripts (package.json):
  - dev: next dev --turbopack
  - build: next build --turbopack
  - start: next start
  - lint: eslint
- No environment variables required. Demo authentication sets a cookie (admin_auth) on successful login; logout clears it.
- next.config.ts adds permissive CORS and frame headers (Access-Control-Allow-*, X-Frame-Options=ALLOWALL, frame-ancestors *).
- TypeScript: strict, noEmit; path alias @/* -> src/*.

3) Repository Structure (brief)
- src/app
  - layout.tsx: App shell wrapper (ThemeProvider + AppShell) and metadata.
  - page.tsx: Main dashboard (cards, filters, table, modal with transaction details).
  - login/page.tsx: Admin login form calling /api/login.
  - api/login/route.ts: Accepts {login,password}; if admin/admin, sets cookie admin_auth=1.
  - api/logout/route.ts: Clears admin_auth cookie.
  - globals.css, theme.css: Tailwind and custom design tokens/utilities.
- src/middleware.ts: Protects routes; allows /login, /_next, favicon, and auth APIs; otherwise redirects to /login if cookie missing.
- src/components: AppShell, Sidebar, Topbar, ThemeProvider (light/dark), Cards, FiltersBar (flatpickr + react-range), Table, Modal.
- src/lib/mockRepo.ts: Generates mock transactions and applies filters.
- src/types.ts: Types for transactions, filters, operation types.
- public/*.svg: Icons/assets.
- Config: eslint.config.mjs (extends next/core-web-vitals & next/typescript), postcss.config.mjs (Tailwind), tsconfig.json (paths/strict), next.config.ts (headers).

CI / Quality Tooling
- .github/ not present → No GitHub Actions workflows detected (no CI configured in-repo).
- Linting: npm run lint uses ESLint 9 with Next.js config; ignores node_modules, .next, out, build, next-env.d.ts.
- Pre-commit hooks: none configured in-repo.

How to Run
- npm install (if needed)
- npm run dev and open http://localhost:3000
- Log in at /login with admin/admin to access protected pages. Use POST /api/logout to end session.
