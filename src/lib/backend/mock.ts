// FAKE backend for building without Supabase (NEXT_PUBLIC_USE_MOCK is not "false").
// - Data lives in this browser's localStorage, so two tabs of the SAME browser share it and update each other live.
// - Each tab is a different student (student id lives in sessionStorage), so you can test two students in two tabs.
// - A ready-made class exists: code DEMO01, 3 slides.
// - Reset everything: in the browser console run  localStorage.removeItem("lost-mock-db-v1")  and refresh.
// - Make AI calls fail (to test error states): localStorage.setItem("lost-mock-fail-ai", "1")
import type { Annotation, AnnotationEvent, LivePhase, NewAnnotation, NewSignal, Session, Signal, Unsubscribe } from "../types";
import { ERRORS, cleanOtherText, normalizeCode, randomCode, validateAnnotation, validateSignal } from "./rules";

type Member = { sessionId: string; studentId: string; name: string };
type StoredAnnotation = Annotation & { removedAt?: string }; // removed strokes are kept but hidden, like the real database
type DB = { sessions: Session[]; signals: Signal[]; members: Member[]; annotations: StoredAnnotation[] };

const DB_KEY = "lost-mock-db-v1";
const STUDENT_KEY = "lost-student-id";
const FAIL_AI_KEY = "lost-mock-fail-ai";
export const DEMO_SESSION_ID = "00000000-0000-4000-8000-000000000001";

function demoSession(): Session {
  return {
    id: DEMO_SESSION_ID,
    code: "DEMO01",
    title: "Pointers 101 (demo)",
    currentSlide: 1,
    phase: "presenting",
    slides: [
      { number: 1, imageUrl: "/demo-slides/1.svg", text: "Pointers & memory. A pointer stores the address of another value. Every variable lives at an address in memory." },
      { number: 2, imageUrl: "/demo-slides/2.svg", text: "Pointer arithmetic. address(arr[i]) = base + i × sizeof(T). Example: int arr[4] at 0x1000, arr[2] is at 0x1008." },
      { number: 3, imageUrl: "/demo-slides/3.svg", text: "Indirection. int value = 42; int *p = &value; *p reads 42 by following the pointer." },
    ],
  };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const hasWindow = () => typeof window !== "undefined";

function read(): DB {
  let db: DB = { sessions: [], signals: [], members: [], annotations: [] };
  try {
    const raw = globalThis.localStorage?.getItem(DB_KEY);
    if (raw) db = JSON.parse(raw);
  } catch { /* corrupted or unavailable: start fresh */ }
  db.annotations ??= []; // data saved before annotations existed
  if (!db.sessions.some(s => s.id === DEMO_SESSION_ID)) db.sessions.unshift(demoSession());
  return db;
}

const listeners = new Set<() => void>();
let storageHooked = false;

function write(db: DB) {
  try {
    globalThis.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    throw new Error("Mock storage is full. Use a smaller PDF, reset the mock (see mock.ts), or switch to real mode.");
  }
  queueMicrotask(() => listeners.forEach(l => l())); // this tab; other tabs hear the "storage" event
}

function listen(listener: () => void): Unsubscribe {
  if (!storageHooked && hasWindow()) {
    storageHooked = true;
    window.addEventListener("storage", e => { if (e.key === DB_KEY) listeners.forEach(l => l()); });
  }
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Shrink uploaded slide images so a few slides fit in localStorage (~5 MB limit).
async function toSmallDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1280 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

// ---------- Instructor ----------

export async function createSession(title: string, slides: { image: Blob; text: string }[]): Promise<Session> {
  if (!slides.length) throw new Error("The PDF has no pages");
  const images = await Promise.all(slides.map(s => toSmallDataUrl(s.image)));
  const db = read();
  let code = randomCode();
  while (db.sessions.some(s => s.code === code)) code = randomCode();
  const session: Session = {
    id: crypto.randomUUID(),
    code,
    title: title.trim() || "Untitled class",
    currentSlide: 1,
    phase: "presenting",
    slides: slides.map((s, i) => ({ number: i + 1, imageUrl: images[i], text: s.text })),
  };
  db.sessions.push(session);
  write(db);
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  await wait(100);
  return read().sessions.find(s => s.id === sessionId) ?? null;
}

export async function updateLive(sessionId: string, currentSlide: number, phase: LivePhase): Promise<void> {
  await wait(150);
  const db = read();
  const session = db.sessions.find(s => s.id === sessionId);
  if (!session) throw new Error(ERRORS.noSession);
  if (currentSlide < 1 || currentSlide > session.slides.length) throw new Error("That slide doesn't exist");
  session.currentSlide = currentSlide;
  session.phase = phase;
  write(db);
}

export function subscribeToSession(sessionId: string, onChange: (session: Session) => void): Unsubscribe {
  let last = JSON.stringify(read().sessions.find(s => s.id === sessionId) ?? null);
  return listen(() => {
    const session = read().sessions.find(s => s.id === sessionId);
    const now = JSON.stringify(session ?? null);
    if (session && now !== last) { last = now; onChange(session); }
  });
}

export async function getSlideSignals(sessionId: string, slideNumber: number): Promise<Signal[]> {
  await wait(100);
  return read().signals.filter(s => s.sessionId === sessionId && s.slideNumber === slideNumber);
}

export function subscribeToSignals(sessionId: string, onNew: (signal: Signal) => void): Unsubscribe {
  const seen = new Set(read().signals.filter(s => s.sessionId === sessionId).map(s => s.id));
  return listen(() => {
    for (const s of read().signals) {
      if (s.sessionId === sessionId && !seen.has(s.id)) { seen.add(s.id); onNew(s); }
    }
  });
}

export async function countStudents(sessionId: string): Promise<number> {
  return read().members.filter(m => m.sessionId === sessionId).length;
}

// ---------- Student ----------

export function getMyStudentId(): string {
  if (!hasWindow()) return "";
  let id = sessionStorage.getItem(STUDENT_KEY);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(STUDENT_KEY, id); }
  return id;
}

export async function joinSession(code: string, name: string): Promise<Session> {
  await wait(200);
  const db = read();
  const session = db.sessions.find(s => s.code === normalizeCode(code));
  if (!session) throw new Error(ERRORS.noClass);
  if (session.phase === "ended") throw new Error(ERRORS.ended);
  const studentId = getMyStudentId();
  const member = db.members.find(m => m.sessionId === session.id && m.studentId === studentId);
  if (member) member.name = name.trim();
  else db.members.push({ sessionId: session.id, studentId, name: name.trim() });
  write(db);
  return session;
}

export async function submitSignal(input: NewSignal): Promise<Signal> {
  await wait(200);
  const db = read();
  const existing = db.signals.find(s => s.id === input.id);
  if (existing) return existing; // a retry of something already saved: don't count it twice
  const session = db.sessions.find(s => s.id === input.sessionId);
  if (!session) throw new Error(ERRORS.noSession);
  validateSignal(input, session);
  const studentId = getMyStudentId();
  if (input.kind === "lost" && db.signals.some(s =>
    s.kind === "lost" && s.sessionId === input.sessionId && s.slideNumber === input.slideNumber && s.studentId === studentId))
    throw new Error(ERRORS.alreadyLost);
  const signal: Signal = {
    id: input.id,
    sessionId: input.sessionId,
    slideNumber: input.slideNumber,
    kind: input.kind,
    rect: input.kind === "region" ? input.rect : undefined,
    categories: [...input.categories],
    otherText: cleanOtherText(input.otherText),
    studentId,
    createdAt: new Date().toISOString(),
  };
  db.signals.push(signal);
  write(db);
  return signal;
}

export async function getMySignals(sessionId: string): Promise<Signal[]> {
  await wait(100);
  const me = getMyStudentId();
  return read().signals.filter(s => s.sessionId === sessionId && s.studentId === me);
}

function aiShouldFail() {
  return globalThis.localStorage?.getItem(FAIL_AI_KEY) === "1";
}

export async function explainSignal(signalId: string): Promise<string> {
  await wait(1000);
  if (aiShouldFail()) throw new Error("AI is unavailable right now");
  const db = read();
  const signal = db.signals.find(s => s.id === signalId);
  if (!signal) throw new Error("Saved item not found");
  const what = (signal.categories.length ? signal.categories.join(", ") : "general confusion") +
    (signal.otherText ? `: "${signal.otherText}"` : "");
  signal.explanation =
    `[Mock explanation] You marked part of slide ${signal.slideNumber} (${what}). ` +
    `A real AI answer will appear here once Person C connects /api/explain. Source: Slide ${signal.slideNumber}`;
  write(db);
  return signal.explanation;
}

export async function makeStudyGuide(sessionId: string): Promise<string> {
  await wait(1500);
  if (aiShouldFail()) throw new Error("AI is unavailable right now");
  const mine = await getMySignals(sessionId);
  if (!mine.length) return "You didn't save anything in this class, so there's nothing to study yet.";
  const slides = [...new Set(mine.map(s => s.slideNumber))].sort((a, b) => a - b);
  return [
    "[Mock study guide]",
    ...slides.map(n => {
      const items = mine.filter(s => s.slideNumber === n);
      return `\nSlide ${n}\n- You marked ${items.length} item(s): ${items.map(s => s.kind === "lost" ? "I'm Lost" : s.categories.join(" + ") + (s.otherText ? ` ("${s.otherText}")` : "")).join("; ")}\n- Practice question: (the real AI writes one here)\n- Source: Slide ${n}`;
    }),
  ].join("\n");
}

// ---------- Instructor annotations (pen strokes) ----------

function visible(a: StoredAnnotation): Annotation {
  return { id: a.id, sessionId: a.sessionId, slideNumber: a.slideNumber, points: a.points, color: a.color, width: a.width, createdAt: a.createdAt };
}

export async function addAnnotation(input: NewAnnotation): Promise<Annotation> {
  await wait(100);
  const db = read();
  const existing = db.annotations.find(a => a.id === input.id);
  if (existing) return visible(existing); // a retry of a stroke that's already saved: don't add it twice
  const session = db.sessions.find(s => s.id === input.sessionId);
  if (!session) throw new Error(ERRORS.noSession);
  validateAnnotation(input, session);
  const annotation: Annotation = {
    id: input.id,
    sessionId: input.sessionId,
    slideNumber: input.slideNumber,
    points: input.points.map(p => ({ x: p.x, y: p.y })),
    color: input.color,
    width: input.width,
    createdAt: new Date().toISOString(),
  };
  db.annotations.push(annotation);
  write(db);
  return annotation;
}

// Stored in the order they were drawn, so this is oldest first.
export async function getAnnotations(sessionId: string, slideNumber: number): Promise<Annotation[]> {
  await wait(50);
  return read().annotations.filter(a => a.sessionId === sessionId && a.slideNumber === slideNumber && !a.removedAt).map(visible);
}

export async function removeAnnotations(sessionId: string, ids: string[]): Promise<void> {
  await wait(50);
  const db = read();
  const removedAt = new Date().toISOString();
  let changed = false;
  for (const a of db.annotations) {
    if (a.sessionId === sessionId && ids.includes(a.id) && !a.removedAt) { a.removedAt = removedAt; changed = true; }
  }
  if (changed) write(db);
}

// Like subscribeToSignals: strokes added or removed after subscribing, on every slide of the class.
export function subscribeToAnnotations(sessionId: string, onEvent: (e: AnnotationEvent) => void): Unsubscribe {
  const mine = read().annotations.filter(a => a.sessionId === sessionId);
  const known = new Set(mine.map(a => a.id));                      // every stroke seen so far, removed or not
  const shown = new Set(mine.filter(a => !a.removedAt).map(a => a.id)); // strokes the page currently draws
  return listen(() => {
    const removed: string[] = [];
    for (const a of read().annotations) {
      if (a.sessionId !== sessionId) continue;
      if (!known.has(a.id)) {
        known.add(a.id);
        if (a.removedAt) continue; // added and removed before we looked: nothing to show
        shown.add(a.id);
        onEvent({ type: "added", annotation: visible(a) });
      } else if (a.removedAt && shown.has(a.id)) {
        shown.delete(a.id);
        removed.push(a.id);
      }
    }
    if (removed.length) onEvent({ type: "removed", ids: removed });
  });
}
