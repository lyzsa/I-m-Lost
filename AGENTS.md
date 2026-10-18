# Rules for AI coding assistants on this repo

LOST was built by 3 people in a 10-hour hackathon. The humans are not experienced programmers. Keep code simple and explain how to test what you build.

## Where things stand (read before doing anything)

The app is built and deployed (https://i-m-lost.vercel.app). Work now is fixes and polish, not new architecture. Read these first:

- `README.md`: what the app does, how to run it.
- `docs/architecture.md`: the contract, both backends, data model, live sync, AI pipeline.
- `docs/decisions.md`: product decisions, including the ones made during the build. Follow them.
- `CONTRIBUTING.md`: who owns which files, branches, pull requests.
- `docs/build-plan.md`: the original 10-hour plan (historical). Code comments cite its step numbers (A1, B4, C2, section 4.6).

| Piece | Where |
| --- | --- |
| The contract (every data function screens may call) | `src/lib/api.ts`. The `Backend` type makes `npm run typecheck` fail if a backend drifts from it. |
| Shared data shapes | `src/lib/types.ts`, `src/lib/domain.ts` |
| Mock backend (default, in the browser) | `src/lib/backend/mock.ts` |
| Real backend (Supabase) | `src/lib/backend/supabase.ts` |
| Validation and exact error messages, shared by both | `src/lib/backend/rules.ts` |
| AI routes (Google Gemini, server-only) | `src/app/api/` |
| Slide display shared by every screen | `src/components/SlideView.tsx` (`SlideView`, `RectBox`, `toSlideFraction`) |
| Instructor ink, shown on both sides | `src/features/annotations/` |
| Database schema | `supabase/migrations/0001` to `0003` (already run on the team project) |

**How to test without any accounts:** `cp .env.example .env.local`, `npm run dev`, then in ONE browser:
- Tab 1 (instructor of the demo class): `http://localhost:3000/host/00000000-0000-4000-8000-000000000001`
- Tab 2 (student): `http://localhost:3000/join?code=DEMO01`
- Reset the fake data: in the browser console, `localStorage.removeItem("lost-mock-db-v1")`, then refresh. Make AI calls fail on purpose: `localStorage.setItem("lost-mock-fail-ai", "1")`.
- Phones can't reach the mock. Cross-device testing needs the real backend (`NEXT_PUBLIC_USE_MOCK=false`) or the live site.

**Gotchas already known:**
- This is Next.js 16: pages with `[sessionId]` in the path get the id via `useParams()` in client components. Read the Next.js note at the bottom of this file.
- Components using state, effects or the contract functions need `"use client"` as their first line.
- pdf.js only runs in the browser and is loaded inside the upload handler (`src/features/instructor/pdfToSlides.ts`). It uses pdf.js's **legacy** build plus a small stream fix, because the normal build breaks uploads on Safari / iPhone / iPad. The worker lives in `public/pdfjs/`. Don't switch back to `import("pdfjs-dist")`.
- The mock shrinks uploaded slides to fit browser storage (about 5 MB total), so test with short PDFs.
- `next dev` and `next build` rewrite `next-env.d.ts`. Don't commit that change: `git checkout next-env.d.ts`.

## Rules

1. **Read the docs listed above first.** `docs/decisions.md` (product behavior) is binding. Security is demo-level on purpose: do not add auth, RLS or RPCs unless the team asks.
2. **Ask the human which role they are (A, B or C)** if they haven't said. Only create or edit files owned by that role (see `CONTRIBUTING.md`). If a change is needed in someone else's file, stop and tell the human what to ask that teammate for.
3. **The contract is frozen.** Do not rename or change the signatures in `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/domain.ts` or `src/components/SlideView.tsx` unless the human says the team agreed.
4. **Pages and components get data only through `@/lib/api`.** Only files under `src/lib/backend/` and `src/app/api/` may import Supabase.
5. **No new npm packages** unless the human confirms that Person C agreed.
6. **Positions on a slide are fractions from 0 to 1 of the slide image.** Draw slides with `SlideView`/`RectBox`, never with pixel positions.
7. **Never put secret keys in browser code.** AI calls happen only in `src/app/api/**`. Only `NEXT_PUBLIC_*` variables may be read in the browser.
8. **Reuse before writing.** `src/lib/domain.ts` has `advance`, `atPoint`, `counts` and `categories`; `src/features/instructor/denseAreas.ts` finds confusion spots; `src/features/annotations/` draws instructor ink.
9. **Before saying something is done**, run `npm run typecheck`, `npm test` and `npm run build`, and give the human exact steps to test it in the browser (with `NEXT_PUBLIC_USE_MOCK=true`, two tabs of the same browser can act as instructor and student).
10. **Never resolve a Git conflict by deleting another person's code.** Stop and tell the human to call Person C.
11. Use Tailwind classes and match the existing look. Design student screens for phones first.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
