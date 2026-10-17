// POST /api/explain  {signalId}  ->  {explanation}   (docs/build-plan.md step C4, used by Explain Now)
// Reads the saved signal and its slide, asks Gemini, stores the answer on the signal.
import { EXPLAIN_SYSTEM, SIGNAL_COLUMNS, ask, db, describeMark, errorResponse, imageBudget, slideImages, slideText, type SignalRow, type SlideRow } from "../ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { signalId } = await request.json().catch(() => ({}));
    if (typeof signalId !== "string") return Response.json({ error: "signalId is required" }, { status: 400 });
    const supabase = db();

    const { data: signal, error } = await supabase.from("signals").select(SIGNAL_COLUMNS).eq("id", signalId).maybeSingle<SignalRow>();
    if (error) throw new Error(error.message);
    if (!signal) return Response.json({ error: "Saved item not found" }, { status: 404 });
    const { data: slide, error: slideError } = await supabase.from("slides").select("slide_number, image_url, extracted_text")
      .eq("session_id", signal.session_id).eq("slide_number", signal.slide_number).single<SlideRow>();
    if (slideError) throw new Error(slideError.message);

    const explanation = await ask(EXPLAIN_SYSTEM, [
      { type: "text", text: `${slideText(slide)}\nWhat the student marked: ${describeMark(signal)}` },
      ...(await slideImages(slide.image_url, [signal], imageBudget())),
    ]);

    const { error: saveError } = await supabase.from("signals").update({ explanation }).eq("id", signalId);
    if (saveError) throw new Error(saveError.message);
    return Response.json({ explanation });
  } catch (err) {
    return errorResponse(err);
  }
}
