// REAL backend (used when NEXT_PUBLIC_USE_MOCK=false). Person C fills this in: PLAN.md step C2 (data) and C4 (AI).
// Every function must match the Backend type in src/lib/api.ts; `npm run typecheck` fails if it doesn't.
// Reuse ERRORS / validateSignal / randomCode from ./rules so the real app behaves exactly like the mock.
import type { LivePhase, NewSignal, Session, Signal, Unsubscribe } from "../types";

const STUDENT_KEY = "lost-student-id";

function notBuilt(name: string): never {
  throw new Error(`${name}: real backend not built yet (PLAN.md step C2/C4). Set NEXT_PUBLIC_USE_MOCK=true in .env.local.`);
}

// ---------- Professor ----------
export async function createSession(_title: string, _slides: { image: Blob; text: string }[]): Promise<Session> { return notBuilt("createSession"); }
export async function getSession(_sessionId: string): Promise<Session | null> { return notBuilt("getSession"); }
export async function updateLive(_sessionId: string, _currentSlide: number, _phase: LivePhase): Promise<void> { return notBuilt("updateLive"); }
export function subscribeToSession(_sessionId: string, _onChange: (session: Session) => void): Unsubscribe { return notBuilt("subscribeToSession"); }
export async function getSlideSignals(_sessionId: string, _slideNumber: number): Promise<Signal[]> { return notBuilt("getSlideSignals"); }
export function subscribeToSignals(_sessionId: string, _onNew: (signal: Signal) => void): Unsubscribe { return notBuilt("subscribeToSignals"); }
export async function countStudents(_sessionId: string): Promise<number> { return notBuilt("countStudents"); }

// ---------- Student ----------
// One phone = one student, so the real backend keeps the id in localStorage (the mock uses sessionStorage per tab).
export function getMyStudentId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STUDENT_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(STUDENT_KEY, id); }
  return id;
}
export async function joinSession(_code: string, _name: string): Promise<Session> { return notBuilt("joinSession"); }
export async function submitSignal(_signal: NewSignal): Promise<Signal> { return notBuilt("submitSignal"); }
export async function getMySignals(_sessionId: string): Promise<Signal[]> { return notBuilt("getMySignals"); }
export async function explainSignal(_signalId: string): Promise<string> { return notBuilt("explainSignal"); }
export async function makeStudyGuide(_sessionId: string): Promise<string> { return notBuilt("makeStudyGuide"); }
