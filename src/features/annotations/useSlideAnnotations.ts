"use client";
// The instructor's pen strokes for one slide, loaded once and then kept up to date live.
// Shared by the instructor screen (A) and the student screen (B):
//   const strokes = useSlideAnnotations(sessionId, slideNumber);
//   <AnnotationLayer annotations={strokes} />   // inside <SlideView>
import { useEffect, useState } from "react";
import { getAnnotations, subscribeToAnnotations, type Annotation, type AnnotationEvent } from "@/lib/api";

const byTime = (a: Annotation, b: Annotation) => a.createdAt.localeCompare(b.createdAt);

// Apply one live event to a slide's list: add strokes for this slide (no duplicates), drop removed ones.
export function applyAnnotationEvent(list: Annotation[], event: AnnotationEvent, slideNumber: number): Annotation[] {
  if (event.type === "removed") return list.filter(a => !event.ids.includes(a.id));
  const a = event.annotation;
  if (a.slideNumber !== slideNumber || list.some(x => x.id === a.id)) return list;
  return [...list, a].sort(byTime);
}

export function useSlideAnnotations(sessionId: string, slideNumber: number): Annotation[] {
  const key = `${sessionId}:${slideNumber}`;
  const [state, setState] = useState<{ key: string; list: Annotation[] }>({ key: "", list: [] });

  useEffect(() => {
    let active = true;
    const removed = new Set<string>(); // removals that arrive while the first load is still on its way
    const update = (fn: (list: Annotation[]) => Annotation[]) =>
      setState(prev => ({ key, list: fn(prev.key === key ? prev.list : []) }));

    const unsubscribe = subscribeToAnnotations(sessionId, event => {
      if (!active) return;
      if (event.type === "removed") event.ids.forEach(id => removed.add(id));
      update(list => applyAnnotationEvent(list, event, slideNumber));
    });
    getAnnotations(sessionId, slideNumber)
      .then(loaded => {
        if (!active) return;
        update(list => {
          const ids = new Set(list.map(a => a.id));
          return [...list, ...loaded.filter(a => !ids.has(a.id) && !removed.has(a.id))].sort(byTime);
        });
      })
      .catch(err => console.error("LOST: couldn't load the instructor's strokes", err));
    return () => { active = false; unsubscribe(); };
  }, [sessionId, slideNumber, key]);

  return state.key === key ? state.list : []; // never show the previous slide's strokes on a new slide
}
