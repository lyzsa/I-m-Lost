# Contributing

## Setup

You need Node.js 22 or newer.

```sh
git clone https://github.com/lyzsa/I-m-Lost.git
cd I-m-Lost
npm ci
cp .env.example .env.local
npm run dev
```

The app starts on the in-browser mock backend, so no accounts are needed. See the [README](README.md#run-it-locally) for the demo class links and for switching to Supabase.

Never commit `.env.local` or any key. Only `NEXT_PUBLIC_*` variables may be used in browser code; `GEMINI_API_KEY` is read only in `src/app/api/`.

## Who owns what

During the build each person owned one area, so work could happen in parallel without conflicts. Changes to someone else's area go through them.

| Area | Owner | Paths |
| --- | --- | --- |
| Instructor screens | Person A | `src/app/page.tsx`, `src/app/host/**`, `src/features/instructor/**` |
| Student screens | Person B | `src/app/join/**`, `src/app/class/**`, `src/features/student/**` |
| Data, AI, hosting, merging | Person C | `src/lib/**`, `src/app/api/**`, `supabase/**`, config |
| Shared | Agreed by all | `src/components/SlideView.tsx`, `src/features/annotations/**` |

**The contract is frozen.** `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/domain.ts` and `src/components/SlideView.tsx` change only when the whole team agrees. A contract change comes with matching changes to both backends and, if it touches the database, a new numbered migration in `supabase/migrations/`.

Pages and components get data only through `@/lib/api`. Only `src/lib/backend/` and `src/app/api/` import Supabase.

## Branches and pull requests

1. Start from an up-to-date `main`: `git checkout main && git pull`.
2. Work on your own branch (`Yota---A`, `jesscaB` and `c-*` were used during the build).
3. Before pushing, run:

   ```sh
   npm run typecheck
   npm test
   npm run build
   ```

   `next dev` and `next build` rewrite `next-env.d.ts`. Don't commit that change: `git checkout next-env.d.ts`.
4. Push and open a pull request to `main`. Say what changed and how to test it in the browser.
5. Person C (the repo owner) merges. Vercel's free plan only deploys commits it can match to the repo owner, so pull requests from other people show a "blocked" preview; that is expected, and the merge deploys normally.

CI runs typecheck, tests and build on every push and pull request.

## Conventions

- Keep code simple; the team includes people new to programming.
- Positions on a slide are fractions from 0 to 1. Draw on slides with `SlideView` and `RectBox`, never with pixel positions.
- Use Tailwind classes and match the existing look. Design student screens for phones first.
- Ask the team before adding an npm package.
- Commit messages: short, prefixed with the area (`instructor:`, `student:`, `AI:`, `Contract:`).

## AI coding assistants

The team built LOST with AI coding assistants. [AGENTS.md](AGENTS.md) holds the rules they must follow (`CLAUDE.md` points to it).
