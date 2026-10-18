"use client";
// Saving, undoing and clearing the instructor's strokes on the current slide. Strokes show immediately
// (before the save finishes) and Undo/Clear hide them immediately, so the pen feels instant even on slow Wi-Fi.
import { useCallback, useState } from "react";
import { addAnnotation, removeAnnotations, type Annotation } from "@/lib/api";
import { useSlideAnnotations } from "@/features/annotations/useSlideAnnotations";

type Point = { x: number; y: number };
type Pending = Omit<Annotation, "createdAt">;

export function useInstructorPen(sessionId: string, slideNumber: number) {
  const saved = useSlideAnnotations(sessionId, slideNumber);
  const [pending, setPending] = useState<Pending[]>([]);     // drawn, still saving
  const [hidden, setHidden] = useState<Set<string>>(new Set()); // undone/cleared, removal still on its way
  const [error, setError] = useState("");

  const savedIds = new Set(saved.map(a => a.id));
  const visibleSaved = saved.filter(a => !hidden.has(a.id));
  const strokes = [
    ...visibleSaved,
    ...pending.filter(p => p.slideNumber === slideNumber && !savedIds.has(p.id) && !hidden.has(p.id)),
  ];

  const addStroke = useCallback((points: Point[], color: string, width: number) => {
    const stroke: Pending = { id: crypto.randomUUID(), sessionId, slideNumber, points: [...points], color, width };
    setPending(list => [...list, stroke]);
    setError("");
    addAnnotation(stroke)
      // keep it in "pending" a few seconds so it doesn't flicker before the live update arrives
      .then(() => setTimeout(() => setPending(list => list.filter(p => p.id !== stroke.id)), 5000))
      .catch(e => {
        setPending(list => list.filter(p => p.id !== stroke.id));
        setError(e instanceof Error ? `Couldn't save that stroke: ${e.message}` : "Couldn't save that stroke.");
      });
  }, [sessionId, slideNumber]);

  const remove = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setHidden(h => new Set([...h, ...ids]));
    setError("");
    removeAnnotations(sessionId, ids).catch(e => {
      setHidden(h => new Set([...h].filter(id => !ids.includes(id))));
      setError(e instanceof Error ? `Couldn't remove: ${e.message}` : "Couldn't remove.");
    });
  }, [sessionId]);

  const lastSaved = visibleSaved[visibleSaved.length - 1];
  return {
    strokes,                                                   // everything to draw on this slide
    addStroke,
    undo: () => { if (lastSaved) remove([lastSaved.id]); },
    clearSlide: () => remove(visibleSaved.map(a => a.id)),
    canUndo: !!lastSaved,
    hasStrokes: visibleSaved.length > 0,
    error,
  };
}
