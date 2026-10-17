// Numbers the professor sees for a set of signals (one slide, or the whole class).
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
