"use client";
// Small round buttons floating on the side of the screen, like a phone's "assistive touch" dot.
// Drag them anywhere; on release they snap to the nearest side so they don't sit on top of the slide's text.
// Their place is remembered on this device. Messages show as a small bubble next to them for a few seconds.
import { useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "lost-floating-position";
const EDGE = 12; // px gap from the screen edge
type Place = { side: "left" | "right"; y: number };
export type Toast = { id: number; text: string; error: boolean };

function load(): Place | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Place) : null;
  } catch {
    return null;
  }
}

export function FloatingActions({ children, toast }: { children: ReactNode; toast: Toast | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place>({ side: "right", y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null); // set while being dragged
  const [shown, setShown] = useState<Toast | null>(null);
  const justDragged = useRef(false);

  // Start where the student left it (or in the bottom-right corner), kept on screen.
  useEffect(() => {
    const h = box.current?.offsetHeight ?? 150;
    const saved = load();
    const y = saved?.y ?? window.innerHeight - h - 24;
    setPlace({ side: saved?.side ?? "right", y: Math.max(EDGE, Math.min(window.innerHeight - h - EDGE, y)) });
  }, []);

  // Show each new message for a few seconds (toast.id is the time it was made, so old ones don't pop up again).
  useEffect(() => {
    if (!toast || Date.now() - toast.id > 3500) return;
    setShown(toast);
    const timer = setTimeout(() => setShown(s => (s?.id === toast.id ? null : s)), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function onPointerDown(e: React.PointerEvent) {
    const el = box.current!;
    const start = { px: e.clientX, py: e.clientY, x: el.getBoundingClientRect().left, y: el.getBoundingClientRect().top };
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - start.px, ev.clientY - start.py) < 8) return; // still a tap
      moved = true;
      setDrag({ x: start.x + ev.clientX - start.px, y: start.y + ev.clientY - start.py });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!moved) return;
      justDragged.current = true; // the click that follows a drag must not press a button...
      setTimeout(() => { justDragged.current = false; }, 0); // ...but only that one click
      const { width, height } = el.getBoundingClientRect();
      const x = start.x + ev.clientX - start.px, y = start.y + ev.clientY - start.py;
      const next: Place = {
        side: x + width / 2 < window.innerWidth / 2 ? "left" : "right",
        y: Math.max(EDGE, Math.min(window.innerHeight - height - EDGE, y)),
      };
      setPlace(next);
      setDrag(null);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked: just don't remember */ }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const style = drag
    ? { left: drag.x, top: drag.y }
    : { top: place.y, [place.side]: `max(${EDGE}px, env(safe-area-inset-${place.side}))` };

  return (
    <div
      ref={box}
      style={style}
      className={`fixed z-20 flex touch-none flex-col items-center gap-2 select-none ${drag ? "scale-105" : "transition-[top] duration-200"}`}
      onPointerDown={onPointerDown}
      onClickCapture={e => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); justDragged.current = false; } }}
    >
      {children}
      {shown && (
        <p
          role="status"
          className={`absolute top-0 w-52 rounded-xl px-3 py-2 text-sm shadow-lg ${place.side === "right" ? "right-full mr-2" : "left-full ml-2"} ${shown.error ? "bg-red-50 text-red-700" : "bg-white text-gray-800"}`}
        >
          {shown.text}
        </p>
      )}
    </div>
  );
}
