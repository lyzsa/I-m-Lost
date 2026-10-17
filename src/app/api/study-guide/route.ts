// POST /api/study-guide  {sessionId, studentId}  ->  {guide}   (docs/build-plan.md step C4, used by My Review)
// Builds the guide only from this student's own signals, grouped by slide.
import { STUDY_GUIDE_SYSTEM, SIGNAL_COLUMNS, ask, db, errorResponse, imageBudget, listMarks, slideImages, slideText, type Part, type SignalRow, type SlideRow } from "../ai";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { sessionId, studentId } = await request.json().catch(() => ({}));
    if (typeof sessionId !== "string" || typeof studentId !== "string" || !studentId)
      return Response.json({ error: "sessionId and studentId are required" }, { status: 400 });
    const supabase = db();

    const { data: signals, error } = await supabase.from("signals").select(SIGNAL_COLUMNS)
      .eq("session_id", sessionId).eq("student_id", studentId).order("created_at").returns<SignalRow[]>();
    if (error) throw new Error(error.message);
    if (!signals.length) return Response.json({ guide: "You didn't save anything in this class, so there's nothing to study yet." });

    const numbers = [...new Set(signals.map(s => s.slide_number))].sort((a, b) => a - b);
    const { data: slides, error: slideError } = await supabase.from("slides").select("slide_number, image_url, extracted_text")
      .eq("session_id", sessionId).in("slide_number", numbers).order("slide_number").returns<SlideRow[]>();
    if (slideError) throw new Error(slideError.message);

    const content: Part[] = [];
    const budget = imageBudget();
    for (const slide of slides) {
      const marks = signals.filter(s => s.slide_number === slide.slide_number);
      content.push({ type: "text", text: `${slideText(slide)}\nWhat the student marked on this slide:\n${listMarks(marks)}` },
        ...(await slideImages(slide.image_url, marks, budget)));
    }
    content.push({ type: "text", text: "Write my study guide." });

    // A whole guide takes longer to write than one explanation; both limits stay under maxDuration (120 s).
    return Response.json({ guide: await ask(STUDY_GUIDE_SYSTEM, content, { attemptMs: 40_000, totalMs: 90_000 }) });
  } catch (err) {
    return errorResponse(err);
  }
}
