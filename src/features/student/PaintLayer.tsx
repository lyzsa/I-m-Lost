"use client";
// Finger/mouse "highlighter" on top of a slide (PLAN.md step B4; team choice: paint instead of dragging a box).
// Whatever the student paints, the saved selection is the neat box around it, so the contract (Rect) doesn't change.
// Put it inside <SlideView>, only while the student is in paint mode (so a stray thumb can't mark anything).
// Points are 0..1 fractions of the slide, so the paint stays on the same words when resized.
import { useEffect, useRef } from "react";
import type { Rect } from "@/lib/domain";
import { toSlideFraction } from "@/components/SlideView";

export type Point = { x: number; y: number };
const R = 0.025; // brush radius, as a fraction of the slide width
const PAINT = "#facc15";

// The smallest box around every painted point, grown by the brush size and kept inside the slide.
// null if nothing is painted or the box is tiny (under 0.02 wide or tall).
export function paintedBox(strokes: Point[][], aspect: number): Rect | null {
  const pts = strokes.flat();
  if (!pts.length) return null;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const ry = R * aspect; // aspect = slide width / height, so the brush is round in y too
  const x1 = clamp(Math.min(...pts.map(p => p.x)) - R), x2 = clamp(Math.max(...pts.map(p => p.x)) + R);
  const y1 = clamp(Math.min(...pts.map(p => p.y)) - ry), y2 = clamp(Math.max(...pts.map(p => p.y)) + ry);
  const box = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  return box.width < 0.02 || box.height < 0.02 ? null : box;
}

type Props = {
  strokes: Point[][];
  onChange: (strokes: Point[][], box: Rect | null) => void; // called when a stroke finishes
};

export function PaintLayer({ strokes, onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Point[] | null>(null);

  function line(a: Point, b: Point) {
    const c = canvas.current;
    if (!c) return; // paint mode just closed
    const g = c.getContext("2d")!, w = c.width, h = c.height;
    g.strokeStyle = PAINT;
    g.lineWidth = R * 2 * w;
    g.lineCap = g.lineJoin = "round";
    g.beginPath();
    g.moveTo(a.x * w, a.y * h);
    g.lineTo(b.x * w + (a === b ? 0.1 : 0), b.y * h); // a === b draws a dot
    g.stroke();
  }

  // Repaint all saved strokes whenever they change or the slide is resized (e.g. the phone is rotated).
  useEffect(() => {
    const c = canvas.current!;
    const repaint = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * dpr); // resizing also clears the canvas
      c.height = Math.round(c.clientHeight * dpr);
      for (const s of strokes) s.forEach((p, i) => line(s[Math.max(0, i - 1)], p));
    };
    repaint();
    const observer = new ResizeObserver(repaint);
    observer.observe(c);
    return () => observer.disconnect();
  }, [strokes]);

  function finish() {
    const stroke = drawing.current;
    if (!stroke) return;
    drawing.current = null;
    const c = canvas.current!;
    const next = [...strokes, stroke];
    onChange(next, paintedBox(next, c.clientWidth / c.clientHeight));
  }

  return (
    <canvas
      ref={canvas}
      aria-label="Paint over the part you don't understand"
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none opacity-[.55]"
      onPointerDown={e => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = toSlideFraction(e, e.currentTarget);
        drawing.current = [p];
        line(p, p);
      }}
      onPointerMove={e => {
        const stroke = drawing.current;
        if (!stroke) return;
        const p = toSlideFraction(e, e.currentTarget);
        line(stroke[stroke.length - 1], p);
        stroke.push(p);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
}
