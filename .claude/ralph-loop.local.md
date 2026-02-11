---
active: true
iteration: 28
max_iterations: 30
completion_promise: "COMPLETE"
started_at: "2026-02-11T14:03:07Z"
---

Continue the existing project.

This is part of the SAME repository and terminal session.
Do NOT re-scaffold.

--------------------------------------------------
CRITICAL PRODUCTION BUG
--------------------------------------------------

When deployed on Vercel the site renders a completely white screen.

Likely cause:
- Node-only dependency (@celo/utils or similar)
- SES incompatibility
- Browser bundle crashing at runtime
- Vite/Rollup polyfill mismatch

You MUST:

1) Reproduce the failure in production build locally:
   npm run build && npm run preview

2) Inspect browser console errors on Vercel.

3) Identify which dependency is Node-only.

4) Remove or replace browser-unsafe imports.

5) Ensure no server-only packages are included in client bundles.

6) Fix Vite config:
   - externalize node modules
   - alias replacements
   - conditional imports
   - polyfills ONLY if safe

7) Ensure app renders instead of white screen.

8) Add runtime guards and error boundaries.

--------------------------------------------------
STRICT RULES
--------------------------------------------------

- Do not disable security systems globally as a hack.
- Do not silence errors without fixing root cause.
- No Node-only libs in browser bundle.
- Prefer conditional dynamic imports for server-only code.
- Fix properly for Vercel production.

--------------------------------------------------
VERIFICATION REQUIRED
--------------------------------------------------

Before finishing:

- Site loads on Vercel
- No blank screen
- No console runtime crash
- Build passes
- Preview works
- TypeScript clean

--------------------------------------------------
OUTPUT

When everything is complete output:

[promise]COMPLETE[/promise]

--------------------------------------------------

MAX ITERATIONS 30
COMPLETION PROMISE COMPLETE
