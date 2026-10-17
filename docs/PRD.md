# LOST: Product requirements

Written before the build (translated from the original Chinese draft, v0.1) and updated with what was built. Where the build differs from the plan, the **Status** notes say so. The reasons for each change are in [decisions.md](decisions.md).

## Goal

At the end of each slide, the instructor sees **where** students are confused and **why**. Students keep a record of what confused them and get review help that knows what was on the slide.

Demo goal: one instructor and two or more students, on separate devices, run a whole class from a short PDF.

## Instructor flow

Upload a PDF → create the class → show the code and a QR code that opens the join page → **Presenting**.

Click **Review** to stay on the slide and see the heatmap, the I'm Lost count and the marked-area count. Click a busy area to see its reason counts. Switch the heatmap off for a clean view. Click **Next** to move every student to the next slide and go back to Presenting. Review works even with no feedback, and older slides' feedback is never deleted. After the last slide, end the class and see a summary.

**Status: built**, with these changes:

- No instructor login. Classes are remembered on the device that created them.
- PDFs up to 20 pages.
- The instructor can also jump to any slide, end the class at any time, and draw on the slide for every student to see.
- Busy areas are grouped into numbered **confusion spots**: hover to see reasons, click to keep the window open and read "Other" responses.
- The end-of-class summary shows every slide with its heatmap, spots, reason charts and responses.

## Student flow

Type the code or scan the QR code → join → follow the live slide. Browsing to another slide detaches the student: live changes no longer move their screen, and **Back to Live** returns to the current slide at once.

**I'm Lost** saves a whole-slide signal right away, with no made-up area. To be specific, the student marks an area → picks one or more reasons → **Save for Later** (default) or **Explain Now**. A failed save can be retried, and the screen only says "saved" once the save is confirmed.

Explain Now saves the signal first, so a failed AI call never loses the feedback. After class, each student sees only their own saved items, slide by slide, and can generate a **personal study guide** (the confusing concept, an explanation, a practice question and the source). No teaching advice is generated for the instructor.

**Status: built**, with these changes:

- Students **highlight** the confusing part instead of dragging a rectangle; each highlighted part is saved as the box around it.
- Reasons are optional. *Other* asks for the student's own question (up to 200 characters).
- A thumbnail strip with a **LIVE** tag replaces Back/Forward buttons.
- Explanations reopen from a 💡 beside the slide or by tapping the mark. When class ends, a pop-up recaps the day's explanations.

## How feedback is counted

- I'm Lost counts and marked-area counts are shown separately. The number of **students** is counted separately too, with each student counted once.
- A mark can have several reasons, so the reason counts can add up to more than the number of marks.
- Signals without an area don't appear on the heatmap.
- Positions are relative to the slide itself, not the toolbar or margins, so zoom and screen size don't move them.
- Heat comes from overlap. The UI must say whether a number covers a point or a whole cluster.

**Status: built.** Overlapping marks are grouped into connected clusters on a grid, and a cluster becomes a numbered spot once enough students have marked it (2 by default; adjustable on the summary page). Spot windows say "N students marked here".

## AI and transcription

The server builds the AI's context from the slide's extracted text, the marked area and its reasons, and, if available, up to the last 120 seconds of transcribed lecture for that slide. The context is limited in size and never includes later transcripts or other classes. Sources (slide number, transcript timestamps) are recorded. Without a transcript, the answer is labelled slide-only. A scanned PDF with no text gets a clear "not enough material" message. Image understanding is not required for the first version. Transcription can be turned off without affecting feedback.

**Status:**

- **Built:** server-side AI (Google Gemini) using the slide image, its text, a close-up of the marked area and the student's question. Answers end with "Source: Slide N".
- **Not built:** transcription. The AI works from the slide alone. Because it sees the slide image, scanned PDFs and diagrams still work.

## Acceptance checklist

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Students who join see the same PDF and the same live slide. A wrong code or an ended class shows a clear error. | Built |
| 2 | The first click (Review) doesn't change the slide; the second (Next) does. Students can't change the live slide. | Built. Without logins, anyone with the instructor's link could control the class. |
| 3 | A student who browsed away isn't pulled back; Back to Live works. | Built |
| 4 | I'm Lost only changes the count. Overlapping areas are darker. Multi-reason counts are correct. | Built |
| 5 | Marks stay on the right spot after resizing the window. Signals survive a refresh. | Built |
| 6 | Retrying a save never counts twice. One class can't read another's data. Students can't see each other's saved items or AI answers. | Retries: built. Data isolation: only in the UI; the database is open (demo-level security). |
| 7 | Everything works with no microphone and no transcription service. | Built (transcription isn't built) |
| 8 | Explain Now cites the current slide (and transcript if any). If the AI fails, the saved item is still there to review. | Built (slide only) |
| 9 | The study guide uses only the student's own saved items and lists its sources. | Built |

## Scope

- **Must have (P0):** PDF upload, joining, live sync, review, saved signals, heatmap and counts, personal review list, slide-only AI explanation and study guide. **All built.**
- **Nice to have (P1):** QR code (**built**), better clustering (**built**), transcription (not built), exporting history (not built).
- **Out of scope:** LMS integration, university sales, automatic teaching decisions, grading, full lecture recording and playback.
