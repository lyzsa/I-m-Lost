// Numbers the instructor sees for a set of signals (one slide, or the whole class).
import { counts } from "@/lib/domain";
import type { Signal } from "@/lib/types";

export function slideStats(signals: Signal[]) {
  return {
    lost: signals.filter(s => s.kind === "lost").length,          // quick "I'm Lost" taps
    boxes: signals.filter(s => s.kind === "region").length,       // boxes drawn
    students: new Set(signals.map(s => s.studentId)).size,        // different students who gave any feedback
    categories: counts(signals),                                  // per category; one box can count in several
  };
}

// The typed reasons of students who picked "Other", oldest first. Anonymous: no names or ids.
export function otherAnswers(signals: Signal[]): string[] {
  return signals
    .filter(s => s.categories.includes("Other") && s.otherText)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(s => s.otherText!);
}
