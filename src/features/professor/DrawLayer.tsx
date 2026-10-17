"use client";
// The instructor's pen, on top of the slide while Draw mode is on.
//  - Mouse: draws.
//  - Fingers, before any pen has been used (phones, or an iPad used with fingers): 1 finger draws,
//    2 fingers move + pinch-zoom the slide. If a 2nd finger lands mid-stroke, that stroke is dropped.
//  - Once a pen (Apple Pencil) has touched the screen: ONLY the pen draws; 1 finger moves the slide,
//    2 fingers move + pinch-zoom. A resting palm never draws.
// The browser's own scrolling is off here (touch-none), so moving/zooming goes through the ZoomStage around the slide.
import { useRef, useState, type PointerEvent } from "react";
import { toSlideFraction } from "@/components/SlideView";
import { ANNOTATION_LIMITS } from "@/lib/backend/rules";
import { AnnotationLayer } from "@/features/annotations/AnnotationLayer";
import { useZoomStage } from "./ZoomStage";

type Point = { x: number; y: number };
const MIN_STEP = 0.0015; // skip points closer than this to the last one (keeps strokes small)

export function DrawLayer({ color, width, onStroke }: { color: string; width: number; onStroke: (points: Point[]) => void }) {
  const stage = useZoomStage();
  const [current, setCurrent] = useState<Point[] | null>(null);
  const points = useRef<Point[]>([]);
  const drawingPointer = useRef<number | null>(null);
  const penSeen = useRef(false);
  const fingers = useRef(new Map<number, { x: number; y: number }>()); // fingers moving the slide (screen px)
  const lastScreenPos = useRef<{ x: number; y: number } | null>(null); // where the drawing pointer is (screen px)

  function startStroke(e: PointerEvent<HTMLDivElement>) {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable: fine */ }
    drawingPointer.current = e.pointerId;
    lastScreenPos.current = { x: e.clientX, y: e.clientY };
    points.current = [toSlideFraction(e, e.currentTarget)];
    setCurrent([...points.current]);
  }
  function finishStroke(save: boolean) {
    if (drawingPointer.current === null) return;
    drawingPointer.current = null;
    if (save && points.current.length) onStroke(points.current);
    points.current = [];
    setCurrent(null);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault(); // also tells the zoom area not to start a mouse drag
    if (e.pointerType === "mouse") {
      if (e.button === 0 && drawingPointer.current === null) startStroke(e);
      return;
    }
    if (e.pointerType === "pen") {
      penSeen.current = true;
      if (drawingPointer.current === null) startStroke(e);
      return;
    }
    // A finger.
    if (!penSeen.current && drawingPointer.current === null && fingers.current.size === 0) {
      startStroke(e); // one finger, no pen in use: draw
      return;
    }
    if (!penSeen.current && drawingPointer.current !== null) {
      // A second finger while the first was drawing: it's a move/zoom gesture, not a stroke. Drop the stroke
      // and let the first finger join the gesture from where it is now.
      const first = drawingPointer.current;
      const last = lastScreenPos.current;
      finishStroke(false);
      if (last) fingers.current.set(first, last);
    }
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId === drawingPointer.current) {
      lastScreenPos.current = { x: e.clientX, y: e.clientY };
      const p = toSlideFraction(e, e.currentTarget);
      const last = points.current[points.current.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP) return;
      points.current.push(p);
      if (points.current.length >= ANNOTATION_LIMITS.maxPoints) { // very long stroke: save it and keep going
        onStroke(points.current);
        points.current = [p];
      }
      setCurrent([...points.current]);
      return;
    }
    const before = fingers.current.get(e.pointerId);
    if (!before || !stage) return;
    const all = [...fingers.current.entries()];
    if (all.length === 1) {
      stage.panBy(e.clientX - before.x, e.clientY - before.y); // one finger (pen mode): move
    } else {
      // two (or more) fingers: move by the midpoint, zoom by the change in distance between the first two
      const other = all.find(([id]) => id !== e.pointerId)![1];
      const oldMid = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 };
      const newMid = { x: (e.clientX + other.x) / 2, y: (e.clientY + other.y) / 2 };
      const oldDist = Math.hypot(before.x - other.x, before.y - other.y);
      const newDist = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      stage.panBy(newMid.x - oldMid.x, newMid.y - oldMid.y);
      if (oldDist > 10) stage.zoomAt(newDist / oldDist, newMid.x, newMid.y);
    }
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerId === drawingPointer.current) finishStroke(e.type === "pointerup");
    fingers.current.delete(e.pointerId);
  }

  return (
    <div
      className="absolute inset-0 z-[60] cursor-crosshair touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClick={e => e.stopPropagation()}
    >
      <AnnotationLayer annotations={current ? [{ id: "drawing", points: current, color, width }] : []} />
    </div>
  );
}
