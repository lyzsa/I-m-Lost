// Rules and error messages shared by the mock and the real backend, so both behave the same.
import { categories } from "../domain";
import type { NewSignal, Session } from "../types";

export const ERRORS = {
  noClass: "No class with that code",
  ended: "This class has ended",
  alreadyLost: "You already tapped I'm Lost on this slide",
  noSession: "Class not found",
} as const;

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// Throws a readable Error if the signal breaks a rule. Same checks as the database in TASKS.md section 5.
export function validateSignal(s: NewSignal, session: Session): void {
  if (s.slideNumber < 1 || s.slideNumber > session.slides.length) throw new Error("That slide doesn't exist");
  if (s.categories.some(c => !categories.includes(c))) throw new Error("Unknown category");
  if (s.kind === "lost") {
    if (s.rect || s.categories.length) throw new Error("I'm Lost has no box or categories");
    return;
  }
  const r = s.rect;
  if (!r) throw new Error("A box is required");
  if (!s.categories.length) throw new Error("Pick at least one category");
  if (r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 || r.x + r.width > 1.000001 || r.y + r.height > 1.000001)
    throw new Error("Box is outside the slide");
}
