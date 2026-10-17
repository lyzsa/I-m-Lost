"use client";
// Finger/mouse "highlighter" on top of a slide (PLAN.md step B4; team choice: paint instead of dragging a box).
// Whatever the student paints, the saved selection is the neat box around it, so the contract (Rect) doesn't change.
// Put it inside <SlideView>, only while the student is in paint mode (so a stray thumb can't mark anything).
// Points are 0..1 fractions of the slide, so the paint stays on the same words when resized.
// One finger paints; two fingers pinch-zoom the page (the browser does the zooming). The brush is a size on the
// screen, so after zooming in the same brush covers less of the slide and the student can paint more precisely.
import { useEffect, useRef } from "react";
import type { Rect } from "@/lib/domain";
import { toSlideFraction } from "@/components/SlideView";

export type Point = { x: number; y: number };
export type Stroke = { r: number; points: Point[] }; // r = brush radius as a fraction of the slide width
export const BRUSHES = { S: 8, M: 16, L: 28 } as const; // brush width in screen pixels
export type Brush = keyof typeof BRUSHES;
const PAINT = "#facc15";

// The smallest box around every painted point, grown by each stroke's brush size and kept inside the slide.
// null if nothing is painted or the box is tiny (under 0.02 wide or tall).
export function paintedBox(strokes: Stroke[], aspect: number): Rect | null {
  if (!strokes.length) return null;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  let x1 = 1, y1 = 1, x2 = 0, y2 = 0;
  for (const { r, points } of strokes) {
    const ry = r * aspect; // aspect = slide width / height, so the brush is round in y too
    for (const p of points) {
      x1 = Math.min(x1, p.x - r); x2 = Math.max(x2, p.x + r);
      y1 = Math.min(y1, p.y - ry); y2 = Math.max(y2, p.y + ry);
    }
  }
  const box = { x: clamp(x1), y: clamp(y1), width: clamp(x2) - clamp(x1), height: clamp(y2) - clamp(y1) };
  return box.width < 0.02 || box.height < 0.02 ? null : box;
}

type Props = {
  strokes: Stroke[];
  brush: Brush;
  onChange: (strokes: Stroke[], box: Rect | null) => void; // called when a stroke finishes
};

export function PaintLayer({ strokes, brush, onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ pointer: number; stroke: Stroke } | null>(null);

  function line(r: number, a: Point, b: Point) {
    const c = canvas.current;
    if (!c) return; // paint mode just closed
    const g = c.getContext("2d")!, w = c.width, h = c.height;
    g.strokeStyle = PAINT;
    g.lineWidth = r * 2 * w;
    g.lineCap = g.lineJoin = "round";
    g.beginPath();
    g.moveTo(a.x * w, a.y * h);
    g.lineTo(b.x * w + (a === b ? 0.1 : 0), b.y * h); // a === b draws a dot
    g.stroke();
  }

  // Draw all finished strokes again (after a resize, or after throwing away an unfinished stroke).
  function repaint() {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(c.clientWidth * dpr); // resizing also clears the canvas
    c.height = Math.round(c.clientHeight * dpr);
    for (const { r, points } of strokes) points.forEach((p, i) => line(r, points[Math.max(0, i - 1)], p));
  }

  useEffect(() => {
    repaint();
    const observer = new ResizeObserver(repaint);
    observer.observe(canvas.current!);
    return () => observer.disconnect();
  }, [strokes]);

  // A second finger means a pinch, not painting: throw away the stroke that the first finger started.
  function dropStroke() {
    if (!drawing.current) return;
    drawing.current = null;
    repaint();
  }

  function finish(e: React.PointerEvent) {
    const current = drawing.current;
    if (!current || current.pointer !== e.pointerId) return;
    drawing.current = null;
    const c = canvas.current!;
    const next = [...strokes, current.stroke];
    onChange(next, paintedBox(next, c.clientWidth / c.clientHeight));
  }

  return (
    <canvas
      ref={canvas}
      aria-label="Paint over the part you don't understand"
      // pinch-zoom: two fingers still zoom the page, one finger never scrolls it (it paints)
      className="absolute inset-0 h-full w-full cursor-crosshair opacity-[.55] [touch-action:pinch-zoom]"
      onPointerDown={e => {
        if (drawing.current) { dropStroke(); return; }
        if (e.pointerType === "mouse") {
          if (e.button !== 0) return;
          e.preventDefault(); // no text selection while dragging
          e.currentTarget.setPointerCapture(e.pointerId); // keep painting if the mouse leaves the slide (touch does this anyway)
        }
        const zoom = window.visualViewport?.scale ?? 1;
        const r = BRUSHES[brush] / 2 / (e.currentTarget.getBoundingClientRect().width * zoom);
        const p = toSlideFraction(e, e.currentTarget);
        drawing.current = { pointer: e.pointerId, stroke: { r, points: [p] } };
        line(r, p, p);
      }}
      onPointerMove={e => {
        const current = drawing.current;
        if (!current || current.pointer !== e.pointerId) return;
        const { r, points } = current.stroke;
        const p = toSlideFraction(e, e.currentTarget);
        line(r, points[points.length - 1], p);
        points.push(p);
      }}
      onPointerUp={finish}
      onPointerCancel={dropStroke} // the browser took over (e.g. started zooming): don't keep a half stroke
    />
  );
}
