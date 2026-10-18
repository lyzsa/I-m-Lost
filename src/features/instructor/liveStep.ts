// What the instructor's main button does next: Review -> Next -> ... -> (last slide) End class.
import { advance } from "@/lib/domain";
import type { LivePhase, Session } from "@/lib/types";

export type LiveStep = { label: string; slide: number; phase: LivePhase };

export function nextLiveStep(session: Pick<Session, "currentSlide" | "phase" | "slides">): LiveStep | null {
  const { currentSlide, phase } = session;
  const total = session.slides.length;
  if (phase === "ended") return null;
  if (phase === "reviewing" && currentSlide >= total) return { label: "End class", slide: currentSlide, phase: "ended" };
  const next = advance(currentSlide, phase, total);
  return { label: phase === "presenting" ? `Review slide ${currentSlide}` : "Next slide", slide: next.slide, phase: next.phase };
}
