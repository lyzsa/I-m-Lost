"use client";
// The instructor's pen strokes on one slide, kept up to date live (A's shared hook and layer).
// Put it inside <SlideView> BEFORE the student's own marks, so it sits underneath them.
// It never catches taps, so painting and tapping orange boxes still work on top of it.
// A small component of its own so the hook can follow whichever slide is shown.
import { AnnotationLayer } from "@/features/annotations/AnnotationLayer";
import { useSlideAnnotations } from "@/features/annotations/useSlideAnnotations";

export function InstructorInk({ sessionId, slideNumber }: { sessionId: string; slideNumber: number }) {
  const strokes = useSlideAnnotations(sessionId, slideNumber);
  return <AnnotationLayer annotations={strokes} />;
}
