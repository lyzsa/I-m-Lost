"use client";
import { useEffect, useState } from "react";
import { getSlideSignals, subscribeToSignals, type Signal } from "@/lib/api";

// Add signals we haven't seen yet (matched by id), keeping the existing order.
export function mergeSignals(current: Signal[], incoming: Signal[]): Signal[] {
  const seen = new Set(current.map(s => s.id));
  return [...current, ...incoming.filter(s => !seen.has(s.id))];
}

// All students' feedback for one slide: loaded when the slide changes, then kept up to date live.
export function useSlideSignals(sessionId: string, slideNumber: number): Signal[] {
  const [state, setState] = useState<{ key: string; signals: Signal[] }>({ key: "", signals: [] });
  const key = `${sessionId}:${slideNumber}`;

  useEffect(() => {
    let active = true;
    const add = (incoming: Signal[]) =>
      setState(prev => ({ key, signals: mergeSignals(prev.key === key ? prev.signals : [], incoming) }));
    const unsubscribe = subscribeToSignals(sessionId, s => { if (active && s.slideNumber === slideNumber) add([s]); });
    getSlideSignals(sessionId, slideNumber).then(list => { if (active) add(list); }).catch(() => {});
    return () => { active = false; unsubscribe(); };
  }, [sessionId, slideNumber, key]);

  return state.key === key ? state.signals : []; // never show the previous slide's boxes on a new slide
}
