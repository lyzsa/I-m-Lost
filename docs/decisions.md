# Product decisions

This file records what the team decided and why, so nobody has to dig through chat history. The first three sections were written on 2026-10-16, before coding started (translated from the original Chinese). The last section lists the decisions made while building.

## Confirmed before the build

- The goal is a classroom tool built by a team of three for a hackathon. Business model, sales and market validation are out of scope.
- The instructor uploads a PDF, creates a class and controls the live slide. Students join with a code or a QR code.
- Feedback is checked before each slide change: **Presenting → Reviewing → Next**, with no extra forced pop-up. The instructor decides whether to explain again.
- Students follow the live slide by default, can browse other slides freely, and return with **Back to Live**.
- **I'm Lost needs no box.** It only counts toward that slide. Feedback with and without a marked area is shown side by side.
- A marked area can have **several reasons**, and the instructor sees the count for every reason.
- The instructor can switch between a **clean view and a heatmap**. The more marks overlap, the darker the area. Clicking a busy area shows its reason counts.
- The instructor side gets **statistics only**: no AI guesses about why students are confused and no teaching advice.
- The current slide is analysed live. Heatmaps and marks for every slide are kept for later.
- **Explain Now is optional; Save for Later is the default.** After class, the AI writes a personal study guide.
- The AI uses the current slide's content and, if available, the recent transcribed lecture, and cites its sources. Recording is optional; without a transcript the AI works from the slide alone.
- Figures, formulas and other non-text content can be marked. The AI is not required to understand non-text content.

## Defaults chosen before the build (could be changed)

- Reasons: *I don't understand*, *Need an example*, *Why does this work?*, *Other*. (*Other* was a placeholder at first; see below.)
- At most one I'm Lost per student per slide. A student can mark many areas. Each reason counts once per mark. The backend must make retries safe.
- Feedback belongs to the slide the student is looking at, even when they have browsed away from the live slide.
- Internally, a class is identified by its id and slides are numbered from 1. Marked areas are stored as fractions (0 to 1) of the slide, so they line up on any screen size.
- No mechanism to force students to use the app. Recording, if built, must be switched on explicitly and show that it is on.

## Open questions at kickoff, and how they were resolved

| Question | Outcome |
| --- | --- |
| AI provider and model | Google Gemini (`gemini-3.8-flash`, falling back to `gemini-3.5-flash-lite`) |
| Transcription provider | Not built. The AI works from the slide image and text. |
| How long data is kept | Not decided. Data stays in the team's Supabase project. |
| A separate clean view for the projector | Not needed. The heatmap toggle gives a clean view on the same screen. |
| How anonymous students get back to a class | The device remembers the last class; no account. |

## Decided during the build

### Scope (10-hour build)

- The original plan assumed 36 hours. For 10 hours we cut logins, row-level security, server-side permission checks and transcription. Security is demo-level and the README says so.
- To let three people work in parallel, all data goes through one fixed list of functions (`src/lib/api.ts`), with a mock backend in the browser until the real one was ready.

### Students marking confusion

- **Highlight instead of drawing a box.** Students paint over the confusing part like a highlighter. The saved mark is the box around the paint, so the data shape did not change.
- **One I'm Lost button first; highlighting the exact part comes after.** Most students only need the one tap. Students who want to be specific then highlight.
- Highlighting behaves like GoodNotes: each separate highlighted part becomes its own mark, a stroke along one line of text is straightened into a neat bar, a part can be resized by its corner handle (which scales the ink), and quick taps don't paint, so stray touches leave no marks.
- With an Apple Pencil, only the pencil highlights and fingers scroll and zoom. On phones, the reason picker opens only after **Done highlighting**, so it doesn't cover the slide.
- **Reasons are optional.** Saving with none picked counts as *I don't understand*.
- **Other means typing your own question** (1 to 200 characters). The instructor sees these words anonymously. The AI gets them too, marked as student text that it must answer but never follow as instructions.

### What the instructor sees

- **Confusion spots instead of click-a-point counts.** Overlapping highlights are grouped into numbered spots, and a spot only appears once enough students have marked it (2 by default). This keeps one student's scribble from looking like a class-wide problem.
- **Hover shows a spot's window; click pins it.** Showing every window at once was too cluttered.
- The side panel covers the whole slide; per-spot detail lives in the spot windows.
- **Donut charts** for reasons, with one fixed colour per reason on every screen, checked for colour-blind separation.
- The instructor can **jump to any slide** (students follow) and **end the class at any time**, not only after the last slide.
- The end-of-class summary has a slider labelled by **fewer / more students' annotations** instead of a technical "sensitivity" setting.
- The UI says **instructor**, not professor, on the instructor side.

### Instructor drawing

- The instructor can **draw on the slide while explaining**, and every student sees the ink live. Strokes are saved like student marks, but flowing the other way. Undo and Clear hide strokes instead of deleting them.
- On iPad the Apple Pencil draws and fingers move and zoom, as in GoodNotes or Notability. On phones one finger draws and two fingers move and zoom. While drawing, nothing else on the page can be selected, so a long press doesn't open the Copy menu.

### AI

- **Gemini instead of Claude**, the team's choice during step C4.
- The AI explained the line next to the marked one on dense slides. Fix: it now also gets a **close-up of the marked area** and the slide with that area outlined in red.
- Answers are **plain text with textbook-style Unicode math**, because the student screens show plain text.
- Every request has a **time limit, one quick retry and a fallback model**, so a slow or busy model gives the student a clear message instead of a timeout.
- Explanations stay available: a 💡 beside the slide, tapping your own mark, an end-of-class recap, and My Review.

### No logins

- Instructors find their classes on the device they started them on. Students' devices remember the last class they joined.

### Technical

- PDFs are converted in the browser with pdf.js's **legacy build**, because the normal build failed on Safari, iPhone and iPad.
- The mock backend shrinks slide images to fit in browser storage.
