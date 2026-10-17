// Remembers the last class this device joined, so a student who leaves the class page isn't asked for the code again.
// Lives only in this browser (localStorage); if storage is blocked, the student just types the code as before.
import type { Session } from "@/lib/api";

const KEY = "lost-last-class";
export type LastClass = { id: string; code: string; title: string };

export function rememberClass(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: session.id, code: session.code, title: session.title }));
  } catch { /* storage blocked: nothing to remember */ }
}

export function lastClass(): LastClass | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastClass) : null;
  } catch {
    return null;
  }
}
