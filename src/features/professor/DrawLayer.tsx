"use client";
// The instructor's pen, on top of the slide while Draw mode is on. Mouse, finger or pen all draw;
// once a pen (e.g. Apple Pencil) has been used, fingers stop drawing so a resting palm leaves no marks.
// A second finger is ignored. Each finished stroke is handed to onStroke as 0..1 slide fractions.
import { useRef, useState, type PointerEvent } from "react";
import { toSlideFraction } from "@/components/SlideView";
import { ANNOTATION_LIMITS } from "@/lib/backend/rules";
import { AnnotationLayer } from "@/features/annotations/AnnotationLayer";

type Point = { x: number; y: number };
const MIN_STEP = 0.0015; // skip points closer than this to the last one (keeps strokes small)

export function DrawLayer({ color, width, onStroke }: { color: string; width: number; onStroke: (points: Point[]) => void }) {
  const [current, setCurrent] = useState<Point[] | null>(null);
  const points = useRef<Point[]>([]);
  const activePointer = useRef<number | null>(null);
  const penSeen = useRef(false);

  function finish() {
    if (activePointer.current === null) return;
    activePointer.current = null;
    if (points.current.length) onStroke(points.current);
    points.current = [];
    setCurrent(null);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "pen") penSeen.current = true;
    if (e.pointerType === "touch" && penSeen.current) return; // palm or finger while using a pen
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointer.current !== null) return;               // a second finger: ignore
    e.preventDefault();                                       // also tells the zoom area not to move the slide
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointer.current = e.pointerId;
    points.current = [toSlideFraction(e, e.currentTarget)];
    setCurrent([...points.current]);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointer.current) return;
    const p = toSlideFraction(e, e.currentTarget);
    const last = points.current[points.current.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP) return;
    points.current.push(p);
    if (points.current.length >= ANNOTATION_LIMITS.maxPoints) { // very long stroke: save it and keep going
      onStroke(points.current);
      points.current = [p];
    }
    setCurrent([...points.current]);
  }

  return (
    <div
      className="absolute inset-0 z-[60] cursor-crosshair touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClick={e => e.stopPropagation()}
    >
      <AnnotationLayer annotations={current ? [{ id: "drawing", points: current, color, width }] : []} />
    </div>
  );
}
