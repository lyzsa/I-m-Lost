// Classes this browser has hosted, so an instructor who closes the tab can resume (no login).
// Lives only in this browser's storage: another laptop won't see these.
import type { Session } from "@/lib/types";

export type MyClass = { id: string; code: string; title: string; lastOpened: string };

const KEY = "lost-my-classes";
const MAX = 10;

export function getMyClasses(): MyClass[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Newest first; opening a class again moves it to the top.
export function rememberClass(session: Pick<Session, "id" | "code" | "title">): void {
  try {
    const rest = getMyClasses().filter(c => c.id !== session.id);
    const entry: MyClass = { id: session.id, code: session.code, title: session.title, lastOpened: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, MAX)));
  } catch { /* storage blocked (e.g. private mode): resuming just isn't available */ }
}

export function forgetClass(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getMyClasses().filter(c => c.id !== id)));
  } catch { /* ignore */ }
}
