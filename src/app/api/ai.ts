// Server-only helpers shared by /api/explain and /api/study-guide (TASKS.md step C4, using Google Gemini).
// Only these server routes read GEMINI_API_KEY; it never reaches the browser.
// Gemini Interactions API: https://ai.google.dev/api/interactions
import { createClient } from "@supabase/supabase-js";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
// If the main model is overloaded or out of quota, the lighter one usually still answers.
const MODELS = [...new Set([process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash-lite"])];
const VISION_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];

export type Part = { type: "text"; text: string } | { type: "image"; data: string; mime_type: string };

export type SignalRow = {
  id: string; session_id: string; slide_number: number; student_id: string; kind: "lost" | "region";
  categories: string[]; x: number | null; y: number | null; width: number | null; height: number | null;
  other_text: string | null;
};
export const SIGNAL_COLUMNS = "id, session_id, slide_number, student_id, kind, categories, x, y, width, height, other_text";
export type SlideRow = { slide_number: number; image_url: string; extracted_text: string };

// An error whose message the student screens can show as is.
class AiError extends Error {
  constructor(message: string, readonly status: number, readonly tryAnotherModel = false) { super(message); }
}

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase isn't set up on the server");
  return createClient(url, key);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

// One line describing what the student marked, e.g. "Box from 10% to 40% across and 20% to 45% down. Why: Need an example."
// When they picked Other, their own words follow inside <student_note> (angle brackets removed so they can't close the tag).
export function describeMark(s: SignalRow): string {
  if (s.kind === "lost" || s.x === null || s.y === null || s.width === null || s.height === null)
    return "Tapped I'm Lost for the whole slide.";
  const note = s.other_text ? ` In the student's own words: <student_note>${s.other_text.replace(/[<>]/g, "")}</student_note>` : "";
  return `Box from ${pct(s.x)} to ${pct(s.x + s.width)} across and ${pct(s.y)} to ${pct(s.y + s.height)} down. ` +
    `Why: ${s.categories.join(", ")}.${note}`;
}

export function slideText(slide: SlideRow): string {
  return `Slide ${slide.slide_number}. Text on the slide:\n<slide_text>\n${slide.extracted_text || "(no text extracted)"}\n</slide_text>`;
}

// Gemini allows about 20 MB per request, so images share a byte budget and later ones are skipped when it runs out.
// Formats Gemini can't read (like the SVG demo slides) fall back to the slide text only.
export async function slideImage(url: string, budget: { bytesLeft: number }): Promise<Part[]> {
  try {
    const res = await fetch(url);
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!res.ok || !VISION_TYPES.includes(type)) return [];
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > budget.bytesLeft) return [];
    budget.bytesLeft -= bytes.length;
    return [{ type: "image", data: bytes.toString("base64"), mime_type: type }];
  } catch {
    return [];
  }
}

export const imageBudget = () => ({ bytesLeft: 14_000_000 });

type ErrorBody = { error?: { message?: string; status?: string; details?: { reason?: string }[] } };
type Step = { type?: string; content?: { type?: string; text?: string }[] };

export async function ask(system: string, input: Part[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("AI isn't set up yet (check GEMINI_API_KEY)", 503);
  let lastError: unknown;
  for (const model of MODELS) {
    try {
      return await askModel(key, model, system, input);
    } catch (err) {
      if (!(err instanceof AiError) || !err.tryAnotherModel) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

async function askModel(key: string, model: string, system: string, input: Part[]): Promise<string> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model,
        system_instruction: system,
        input,
        generation_config: { thinking_level: "low", max_output_tokens: 8192 }, // short teaching answers: faster
        store: false, // don't keep students' requests on Google's side
      }),
    });
  } catch {
    throw new AiError("AI is unavailable right now", 502, true);
  }

  const data: (ErrorBody & { status?: string; steps?: Step[] }) | null = await res.json().catch(() => null);
  if (!res.ok) {
    const body = data as ErrorBody | ErrorBody[] | null;
    const error = (Array.isArray(body) ? body[0] : body)?.error; // errors can come wrapped in an array
    console.error("Gemini error", model, res.status, error?.message);
    const badKey = res.status === 401 || res.status === 403 || error?.details?.some(d => d.reason === "API_KEY_INVALID");
    if (badKey) throw new AiError("AI isn't set up yet (check GEMINI_API_KEY)", 503);
    if (res.status === 429) throw new AiError("AI is busy right now. Try again in a minute.", 429, true);
    throw new AiError("AI is unavailable right now", 502, res.status >= 500);
  }

  const text = (data?.steps ?? [])
    .filter(step => step.type === "model_output")
    .flatMap(step => step.content ?? [])
    .flatMap(c => (c.type === "text" && c.text ? [c.text] : []))
    .join("\n").trim();
  if (!text) {
    console.error("Gemini returned no text", model, "status:", data?.status);
    throw new AiError("The AI didn't return an answer. Try again.", 502, true);
  }
  return text;
}

// Turns any failure into JSON {error} for the student screens.
export function errorResponse(err: unknown): Response {
  if (err instanceof AiError) return Response.json({ error: err.message }, { status: err.status });
  console.error("LOST AI route:", err);
  return Response.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
}
