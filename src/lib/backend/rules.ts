// Rules and error messages shared by the mock and the real backend, so both behave the same.
import { categories } from "../domain";
import type { NewAnnotation, NewSignal, Session } from "../types";

export const ERRORS = {
  noClass: "No class with that code",
  ended: "This class has ended",
  alreadyLost: "You already tapped I'm Lost on this slide",
  noSession: "Class not found",
} as const;

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const OTHER_TEXT_MAX = 200; // same limit as signals.other_text in supabase/migrations/0002_other_text.sql

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
  const other = cleanOtherText(s.otherText);
  if (s.kind === "lost") {
    if (s.rect || s.categories.length || other) throw new Error("I'm Lost has no box or categories");
    return;
  }
  const r = s.rect;
  if (!r) throw new Error("A box is required");
  if (!s.categories.length) throw new Error("Pick at least one category");
  if (r.x < 0 || r.y < 0 || r.width <= 0 || r.height <= 0 || r.x + r.width > 1.000001 || r.y + r.height > 1.000001)
    throw new Error("Box is outside the slide");
  if (s.categories.includes("Other")) {
    if (!other) throw new Error("Tell us what's confusing in a few words");
    if (other.length > OTHER_TEXT_MAX) throw new Error(`Keep it under ${OTHER_TEXT_MAX} characters`);
  } else if (other) {
    throw new Error("Only add your own words when you pick Other");
  }
}

// What both backends store: the trimmed words, or nothing if they're blank. validateSignal runs first.
export function cleanOtherText(text: string | undefined): string | undefined {
  return text?.trim() || undefined;
}

export const ANNOTATION_LIMITS = { maxPoints: 2000, maxWidth: 0.05, maxColorLength: 20 } as const;

const isFraction = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

// Throws a readable Error if an instructor stroke breaks a rule. Same checks in the mock and the real backend.
export function validateAnnotation(a: NewAnnotation, session: Session): void {
  if (a.slideNumber < 1 || a.slideNumber > session.slides.length) throw new Error("That slide doesn't exist");
  if (!Array.isArray(a.points) || a.points.length < 1 || a.points.length > ANNOTATION_LIMITS.maxPoints)
    throw new Error(`A stroke needs 1 to ${ANNOTATION_LIMITS.maxPoints} points`);
  if (a.points.some(p => !isFraction(p?.x) || !isFraction(p?.y))) throw new Error("Stroke is outside the slide");
  if (!(Number.isFinite(a.width) && a.width > 0 && a.width <= ANNOTATION_LIMITS.maxWidth))
    throw new Error(`Line width must be more than 0 and at most ${ANNOTATION_LIMITS.maxWidth}`);
  if (typeof a.color !== "string" || !a.color.trim() || a.color.length > ANNOTATION_LIMITS.maxColorLength)
    throw new Error(`Colour must be 1 to ${ANNOTATION_LIMITS.maxColorLength} characters`);
}
