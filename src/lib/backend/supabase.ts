// REAL backend (used when NEXT_PUBLIC_USE_MOCK=false). Person C fills this in: TASKS.md step C2 (data) and C4 (AI).
// Every function must match the Backend type in src/lib/api.ts; `npm run typecheck` fails if it doesn't.
// Errors and validation come from ./rules so the real app behaves exactly like the mock.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "../domain";
import type { Annotation, AnnotationEvent, LivePhase, NewAnnotation, NewSignal, Session, Signal, Slide, Unsubscribe } from "../types";
import { ERRORS, cleanOtherText, normalizeCode, randomCode, validateAnnotation, validateSignal } from "./rules";

const STUDENT_KEY = "lost-student-id";
const BUCKET = "slides";
const UNIQUE_VIOLATION = "23505"; // Postgres error code for "that value already exists"

// Database rows use snake_case columns (TASKS.md section 5); the contract uses camelCase.
type SessionRow = { id: string; code: string; title: string; slide_count: number; current_slide: number; phase: LivePhase };
type SlideRow = { slide_number: number; image_url: string; extracted_text: string };
type SignalRow = {
  id: string; session_id: string; slide_number: number; student_id: string; kind: "lost" | "region";
  categories: Category[]; x: number | null; y: number | null; width: number | null; height: number | null;
  other_text: string | null; explanation: string | null; created_at: string;
};
const SESSION_COLUMNS = "id, code, title, slide_count, current_slide, phase";
const SIGNAL_COLUMNS = "id, session_id, slide_number, student_id, kind, categories, x, y, width, height, other_text, explanation, created_at";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase isn't set up: fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    client = createClient(url, key);
  }
  return client;
}

// Supabase returns {data, error} instead of throwing. This turns the error into a normal thrown Error.
function check<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// A mistyped URL would make Postgres reject the id instead of simply finding nothing.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function toSession(row: SessionRow, slides: Slide[]): Session {
  return { id: row.id, code: row.code, title: row.title, slides, currentSlide: row.current_slide, phase: row.phase };
}

function toSignal(row: SignalRow): Signal {
  const { x, y, width, height } = row;
  return {
    id: row.id,
    sessionId: row.session_id,
    slideNumber: row.slide_number,
    studentId: row.student_id,
    kind: row.kind,
    rect: row.kind === "region" && x !== null && y !== null && width !== null && height !== null ? { x, y, width, height } : undefined,
    categories: row.categories ?? [],
    otherText: row.other_text ?? undefined,
    explanation: row.explanation ?? undefined,
    createdAt: row.created_at,
  };
}

async function getSessionRow(sessionId: string): Promise<SessionRow | null> {
  if (!isUuid(sessionId)) return null;
  return check(await db().from("sessions").select(SESSION_COLUMNS).eq("id", sessionId).maybeSingle()) as SessionRow | null;
}

// Slides never change after a class is created, so each device loads them once.
const slideCache = new Map<string, Slide[]>();
async function loadSlides(sessionId: string): Promise<Slide[]> {
  const cached = slideCache.get(sessionId);
  if (cached) return cached;
  const rows = check(await db().from("slides").select("slide_number, image_url, extracted_text")
    .eq("session_id", sessionId).order("slide_number")) as SlideRow[];
  const slides = rows.map(r => ({ number: r.slide_number, imageUrl: r.image_url, text: r.extracted_text }));
  if (slides.length) slideCache.set(sessionId, slides);
  return slides;
}

// ---------- Professor ----------

export async function createSession(title: string, slides: { image: Blob; text: string }[]): Promise<Session> {
  if (!slides.length) throw new Error("The PDF has no pages");
  const id = crypto.randomUUID();
  const storage = db().storage.from(BUCKET);
  const imageUrls = await Promise.all(slides.map(async (s, i) => {
    const path = `${id}/${i + 1}.png`;
    const { error } = await storage.upload(path, s.image, { contentType: s.image.type || "image/png" });
    if (error) throw new Error(`Couldn't upload slide ${i + 1}: ${error.message}`);
    return storage.getPublicUrl(path).data.publicUrl;
  }));

  const cleanTitle = title.trim() || "Untitled class";
  let code = randomCode();
  for (let attempt = 1; ; attempt++) {
    const { error } = await db().from("sessions").insert({ id, code, title: cleanTitle, slide_count: slides.length });
    if (!error) break;
    if (error.code !== UNIQUE_VIOLATION || attempt === 5) throw new Error(error.message);
    code = randomCode(); // that join code is already taken: try another
  }

  const slideList: Slide[] = slides.map((s, i) => ({ number: i + 1, imageUrl: imageUrls[i], text: s.text }));
  check(await db().from("slides").insert(slideList.map(s =>
    ({ session_id: id, slide_number: s.number, image_url: s.imageUrl, extracted_text: s.text }))));
  slideCache.set(id, slideList);
  return { id, code, title: cleanTitle, slides: slideList, currentSlide: 1, phase: "presenting" };
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const row = await getSessionRow(sessionId);
  return row ? toSession(row, await loadSlides(sessionId)) : null;
}

export async function updateLive(sessionId: string, currentSlide: number, phase: LivePhase): Promise<void> {
  if (currentSlide < 1) throw new Error("That slide doesn't exist");
  if (!isUuid(sessionId)) throw new Error(ERRORS.noSession);
  const updated = check(await db().from("sessions").update({ current_slide: currentSlide, phase })
    .eq("id", sessionId).gte("slide_count", currentSlide).select("id")) as { id: string }[];
  if (updated.length) return;
  throw new Error((await getSessionRow(sessionId)) ? "That slide doesn't exist" : ERRORS.noSession);
}

// Changes arrive through Supabase Realtime. A phone that slept or lost its connection may have missed some,
// so the session is re-read whenever the connection (re)opens or the page becomes visible again.
// onChange only fires when the live slide or phase actually changed.
export function subscribeToSession(sessionId: string, onChange: (session: Session) => void): Unsubscribe {
  let closed = false;
  let last = "";
  let events = 0;
  const emit = (row: SessionRow) => {
    loadSlides(sessionId).then(slides => {
      const key = `${row.current_slide}|${row.phase}`;
      if (closed || key === last) return;
      last = key;
      onChange(toSession(row, slides));
    }).catch(err => console.error("LOST: couldn't load slides", err));
  };
  const resync = () => {
    const before = events;
    getSessionRow(sessionId)
      .then(row => { if (row && events === before) emit(row); }) // skip if a newer live update arrived meanwhile
      .catch(err => console.error("LOST: couldn't re-read the session", err));
  };

  const channel = db().channel(`session:${sessionId}:${crypto.randomUUID()}`)
    .on<SessionRow>("postgres_changes",
      { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
      payload => { events++; emit(payload.new); })
    .subscribe(status => { if (status === "SUBSCRIBED") resync(); });
  const onVisible = () => { if (document.visibilityState === "visible") resync(); };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);

  return () => {
    closed = true;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    void db().removeChannel(channel);
  };
}

export async function getSlideSignals(sessionId: string, slideNumber: number): Promise<Signal[]> {
  if (!isUuid(sessionId)) return [];
  const rows = check(await db().from("signals").select(SIGNAL_COLUMNS)
    .eq("session_id", sessionId).eq("slide_number", slideNumber).order("created_at")) as SignalRow[];
  return rows.map(toSignal);
}

export function subscribeToSignals(sessionId: string, onNew: (signal: Signal) => void): Unsubscribe {
  const channel = db().channel(`signals:${sessionId}:${crypto.randomUUID()}`)
    .on<SignalRow>("postgres_changes",
      { event: "INSERT", schema: "public", table: "signals", filter: `session_id=eq.${sessionId}` },
      payload => onNew(toSignal(payload.new)))
    .subscribe();
  return () => { void db().removeChannel(channel); };
}

export async function countStudents(sessionId: string): Promise<number> {
  if (!isUuid(sessionId)) return 0;
  const { count, error } = await db().from("members").select("*", { count: "exact", head: true }).eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------- Student ----------

// One phone = one student, so the real backend keeps the id in localStorage (the mock uses sessionStorage per tab).
export function getMyStudentId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STUDENT_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(STUDENT_KEY, id); }
  return id;
}

export async function joinSession(code: string, name: string): Promise<Session> {
  const row = check(await db().from("sessions").select(SESSION_COLUMNS).eq("code", normalizeCode(code)).maybeSingle()) as SessionRow | null;
  if (!row) throw new Error(ERRORS.noClass);
  if (row.phase === "ended") throw new Error(ERRORS.ended);
  check(await db().from("members").upsert({ session_id: row.id, student_id: getMyStudentId(), name: name.trim() }));
  return toSession(row, await loadSlides(row.id));
}

export async function submitSignal(input: NewSignal): Promise<Signal> {
  const session = await getSession(input.sessionId);
  if (!session) throw new Error(ERRORS.noSession);
  validateSignal(input, session);
  const rect = input.kind === "region" ? input.rect : undefined;
  const row = {
    id: input.id, session_id: input.sessionId, slide_number: input.slideNumber, student_id: getMyStudentId(),
    kind: input.kind, categories: input.categories, other_text: cleanOtherText(input.otherText) ?? null,
    x: rect?.x ?? null, y: rect?.y ?? null, width: rect?.width ?? null, height: rect?.height ?? null,
  };
  // ignoreDuplicates: re-sending an id that's already saved (a retry) inserts nothing, so it can't count twice.
  const { data, error } = await db().from("signals").upsert(row, { onConflict: "id", ignoreDuplicates: true }).select(SIGNAL_COLUMNS);
  if (error) throw new Error(error.code === UNIQUE_VIOLATION ? ERRORS.alreadyLost : error.message);
  const saved = (data as SignalRow[])[0]
    ?? check(await db().from("signals").select(SIGNAL_COLUMNS).eq("id", input.id).single()) as SignalRow;
  return toSignal(saved);
}

export async function getMySignals(sessionId: string): Promise<Signal[]> {
  if (!isUuid(sessionId)) return [];
  const rows = check(await db().from("signals").select(SIGNAL_COLUMNS)
    .eq("session_id", sessionId).eq("student_id", getMyStudentId()).order("created_at")) as SignalRow[];
  return rows.map(toSignal);
}

// The AI runs in server routes (src/app/api) so the key stays secret. Their {error} messages are shown as is.
async function callAi<T>(path: string, body: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("AI is unavailable right now");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "AI is unavailable right now");
  return data as T;
}

export async function explainSignal(signalId: string): Promise<string> {
  return (await callAi<{ explanation: string }>("/api/explain", { signalId })).explanation;
}

export async function makeStudyGuide(sessionId: string): Promise<string> {
  return (await callAi<{ guide: string }>("/api/study-guide", { sessionId, studentId: getMyStudentId() })).guide;
}

// ---------- Instructor annotations (pen strokes) ----------
// Table: supabase/migrations/0003_annotations.sql. Removing a stroke sets removed_at (soft delete),
// because Supabase can't filter DELETE events by session but can filter UPDATE events.

type AnnotationRow = {
  id: string; session_id: string; slide_number: number; points: { x: number; y: number }[];
  color: string; width: number; removed_at: string | null; created_at: string;
};
const ANNOTATION_COLUMNS = "id, session_id, slide_number, points, color, width, removed_at, created_at";

function toAnnotation(r: AnnotationRow): Annotation {
  return { id: r.id, sessionId: r.session_id, slideNumber: r.slide_number, points: r.points, color: r.color, width: r.width, createdAt: r.created_at };
}

export async function addAnnotation(input: NewAnnotation): Promise<Annotation> {
  const session = await getSession(input.sessionId);
  if (!session) throw new Error(ERRORS.noSession);
  validateAnnotation(input, session);
  const row = {
    id: input.id, session_id: input.sessionId, slide_number: input.slideNumber,
    points: input.points.map(p => ({ x: p.x, y: p.y })), color: input.color, width: input.width,
  };
  // ignoreDuplicates: re-sending a stroke that's already saved (a retry) inserts nothing.
  const { data, error } = await db().from("annotations").upsert(row, { onConflict: "id", ignoreDuplicates: true }).select(ANNOTATION_COLUMNS);
  if (error) throw new Error(error.message);
  const saved = (data as AnnotationRow[])[0]
    ?? check(await db().from("annotations").select(ANNOTATION_COLUMNS).eq("id", input.id).single()) as AnnotationRow;
  return toAnnotation(saved);
}

export async function getAnnotations(sessionId: string, slideNumber: number): Promise<Annotation[]> {
  if (!isUuid(sessionId)) return [];
  const rows = check(await db().from("annotations").select(ANNOTATION_COLUMNS)
    .eq("session_id", sessionId).eq("slide_number", slideNumber).is("removed_at", null).order("created_at")) as AnnotationRow[];
  return rows.map(toAnnotation);
}

export async function removeAnnotations(sessionId: string, ids: string[]): Promise<void> {
  const valid = ids.filter(isUuid);
  if (!isUuid(sessionId) || !valid.length) return;
  check(await db().from("annotations").update({ removed_at: new Date().toISOString() })
    .eq("session_id", sessionId).in("id", valid).is("removed_at", null));
}

// Events come from Supabase Realtime: a new row is "added", a row whose removed_at gets set is "removed".
// Strokes that already exist when you subscribe aren't sent (load them with getAnnotations).
// A phone that slept or lost its connection may have missed events, so on every (re)connect and when the page
// becomes visible again the stroke list is re-read and anything missed is sent.
export function subscribeToAnnotations(sessionId: string, onEvent: (e: AnnotationEvent) => void): Unsubscribe {
  if (!isUuid(sessionId)) return () => {};
  let closed = false;
  const known = new Set<string>(); // every stroke seen so far, removed or not
  const shown = new Set<string>(); // strokes the page has been told about and not told were removed

  const added = (r: AnnotationRow) => {
    if (closed || known.has(r.id)) return;
    known.add(r.id);
    if (r.removed_at) return; // added and removed before we looked: nothing to show
    shown.add(r.id);
    onEvent({ type: "added", annotation: toAnnotation(r) });
  };
  const removed = (ids: string[]) => {
    ids.forEach(id => known.add(id));
    const gone = ids.filter(id => shown.delete(id));
    if (!closed && gone.length) onEvent({ type: "removed", ids: gone });
  };

  type Brief = { id: string; removed_at: string | null };
  const list = async () => check(await db().from("annotations").select("id, removed_at").eq("session_id", sessionId)) as Brief[];
  // What already exists right now: remembered, not sent.
  const baseline = list().then(rows => rows.forEach(r => { known.add(r.id); if (!r.removed_at) shown.add(r.id); }));
  const resync = async () => {
    await baseline;
    const rows = await list();
    const missedIds = rows.filter(r => !r.removed_at && !known.has(r.id)).map(r => r.id);
    if (missedIds.length) {
      const missed = check(await db().from("annotations").select(ANNOTATION_COLUMNS).in("id", missedIds).order("created_at")) as AnnotationRow[];
      missed.forEach(added);
    }
    removed(rows.filter(r => r.removed_at && shown.has(r.id)).map(r => r.id));
  };
  const safeResync = () => { resync().catch(err => console.error("LOST: couldn't re-read annotations", err)); };
  baseline.catch(err => console.error("LOST: couldn't load annotations", err));

  const filter = `session_id=eq.${sessionId}`;
  const channel = db().channel(`annotations:${sessionId}:${crypto.randomUUID()}`)
    .on<AnnotationRow>("postgres_changes", { event: "INSERT", schema: "public", table: "annotations", filter }, p => added(p.new))
    .on<AnnotationRow>("postgres_changes", { event: "UPDATE", schema: "public", table: "annotations", filter },
      p => { if (p.new.removed_at) removed([p.new.id]); })
    .subscribe(status => { if (status === "SUBSCRIBED") safeResync(); });
  const onVisible = () => { if (document.visibilityState === "visible") safeResync(); };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);

  return () => {
    closed = true;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
    void db().removeChannel(channel);
  };
}
