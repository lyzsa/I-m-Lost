# Rules for AI coding assistants on this repo

This is a 3-person, 10-hour hackathon build. The humans are not experienced programmers. Keep code simple and explain how to test what you build.

## Status and the plan for you (read before doing anything)

**The shared foundation (TASKS.md step C0) is done.** Do not rebuild or "improve" it. Build on it:

| Already exists | What it is |
|---|---|
| `src/lib/api.ts` | The contract: every data function A and B may call. The `Backend` type makes `npm run typecheck` fail if the real backend drifts from it. |
| `src/lib/types.ts` | `Session`, `Slide`, `Signal`, `NewSignal`, `LivePhase` |
| `src/lib/backend/mock.ts` | Working fake backend (the default). Data lives in the browser; two tabs of the same browser update each other live; each tab is a different student. |
| `src/lib/backend/rules.ts` | Validation and exact error messages shared by mock and real |
| `src/lib/backend/supabase.ts` | Real backend: **stubs only**, Person C fills it in (step C2/C4) |
| `src/components/SlideView.tsx` | `SlideView`, `RectBox`, `toSlideFraction` |
| `public/demo-slides/1-3.svg` | The demo class's slides (text, formula, diagram) |
| Placeholder `page.tsx` for every URL | Each one says its owner and step (they still say PLAN.md, which is now TASKS.md). Replace the whole file when you build it. |
| `supabase/migrations/0001_hackathon.sql` | Database setup. Not yet run in Supabase (step C1). |
| Packages | `pdfjs-dist` (v6), `qrcode.react`, `@anthropic-ai/sdk` are installed. Don't add others. |

**What each role does next** (full steps in TASKS.md sections 7 to 9):
- **Person A (Professor screens):** A1, A2, A3, A4, all on the mock. Target for Checkpoint 1 (hour 4): upload a PDF, land on `/host/[id]`, Review/Next works. Then A5 to A7 (heatmap, stats, QR). Files: `src/app/page.tsx`, `src/app/host/**`, `src/features/professor/**`.
- **Person B (Student screens):** B1, B2, B3, B4, all on the mock. Target for Checkpoint 1: join with `DEMO01`, follow the live slide, I'm Lost, draw a box and save it. Then B5, B6 (Explain Now, My Review). Files: `src/app/join/**`, `src/app/class/**`, `src/features/student/**`.
- **Person C (Plumbing):** C0 is done. Start with C1 (create the Supabase project, run the SQL file), then C3 (deploy to Vercel early), then C2 (fill in `supabase.ts`), then C4 (AI routes in `src/app/api/`). C is also the merge captain.

**How to test without any accounts:** `cp .env.example .env.local`, `npm run dev`, then in ONE browser:
- Tab 1 (professor of the demo class): `http://localhost:3000/host/00000000-0000-4000-8000-000000000001`
- Tab 2 (student): `http://localhost:3000/join?code=DEMO01`
- Reset the fake data: in the browser console, `localStorage.removeItem("lost-mock-db-v1")`, then refresh. Make AI calls fail on purpose: `localStorage.setItem("lost-mock-fail-ai", "1")`.
- Phones can't reach the mock. Real cross-device testing starts at Checkpoint 1, when C switches to Supabase.

**Gotchas already known:**
- This is Next.js 16: pages with `[sessionId]` in the path get the id via `useParams()` in client components (see the comment in each placeholder). Read the Next.js note at the bottom of this file.
- Components using state, effects or the contract functions need `"use client"` as their first line.
- pdf.js only runs in the browser and is loaded inside the upload handler (`src/features/professor/pdfToSlides.ts`). It uses pdf.js's **legacy** build plus a small stream fix, because the normal build breaks uploads on Safari / iPhone / iPad. The worker lives in `public/pdfjs/`. Don't switch back to `import("pdfjs-dist")`.
- The mock shrinks uploaded slides to fit browser storage (about 5 MB total), so test with short PDFs.

## Rules

1. **Read `TASKS.md` first.** It is the source of truth. It used to be called `PLAN.md`, so any comment that still says PLAN.md means `TASKS.md`. `docs/architecture.md` and `docs/CONTINUE.md` describe an older 36-hour plan. Do not implement auth, RLS, RPCs, transcription or clustering from them. `docs/decisions.md` (product behavior) still applies.
2. **Ask the human which role they are (A, B or C)** if they haven't said. Only create or edit files owned by that role (`TASKS.md` section 6). If a change is needed in someone else's file, stop and tell the human what to ask that teammate for.
3. **The contract is frozen.** Do not rename or change the signatures in `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/domain.ts` or `src/components/SlideView.tsx` unless the human says the team agreed (`TASKS.md` section 4.6).
4. **Pages and components get data only through `@/lib/api`.** Only files under `src/lib/backend/` and `src/app/api/` may import Supabase.
5. **No new npm packages** unless the human confirms that Person C agreed. Packages are installed once, centrally.
6. **Box coordinates are fractions from 0 to 1 of the slide image.** Draw slides with `SlideView`/`RectBox`, never with pixel positions.
7. **Never put secret keys in browser code.** AI calls happen only in `src/app/api/**`. Only `NEXT_PUBLIC_*` variables may be read in the browser.
8. **Reuse before writing.** `src/app/demo/page.tsx` already has box drawing, the heatmap, Review/Next and Back to Live. `src/lib/domain.ts` has `advance`, `atPoint`, `counts` and `categories`.
9. **Before saying something is done**, run `npm run typecheck` and `npm run build`, and give the human exact steps to test it in the browser (with `NEXT_PUBLIC_USE_MOCK=true`, two tabs of the same browser can act as professor and student).
10. **Never resolve a Git conflict by deleting another person's code.** Stop and tell the human to call Person C.
11. Use Tailwind classes and match the existing look. Design student screens for phones first.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
