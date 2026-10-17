"use client";
// Finger/mouse/pencil "highlighter" on top of a slide (PLAN.md step B4; team choice: paint instead of dragging a box).
// Whatever the student paints, the saved selection is the neat box around it, so the contract (Rect) doesn't change.
// Put it inside <SlideView>, only while the student is in paint mode (so a stray thumb can't mark anything).
// Points are 0..1 fractions of the slide, so the paint stays on the same words when resized.
// Each separate highlighted part becomes its own box, and a stroke along a line of text is straightened into a neat bar.
// Eraser: while `erasing` (or with a pen's eraser end), touching a stroke removes the whole stroke.
// Phones: one finger paints, two fingers pinch-zoom the page (the browser does the zooming).
// iPad with Apple Pencil: once a pencil touches the slide, only the pencil paints; fingers scroll and pinch-zoom the page
// like anywhere else in Safari (with momentum), even while the other hand is writing. Other pens: one finger scrolls.
// The brush is a size on the screen, so after zooming in the same brush covers less of the slide.
import { useEffect, useRef, useState } from "react";
import type { Rect } from "@/lib/domain";
import { toSlideFraction } from "@/components/SlideView";

export type Point = { x: number; y: number };
export type Stroke = { r: number; points: Point[] }; // r = brush radius as a fraction of the slide width
export const BRUSHES = { Thin: 8, Medium: 16, Thick: 28 } as const; // brush width in screen pixels
const PAINT = "#facc15";

// One box per highlighted part: each stroke gets its own box (grown by its brush size, kept inside the slide),
// and strokes whose boxes overlap (e.g. two passes over the same words) share one box.
// A very thin line (thin brush, a big screen, or zoomed in) still makes a box: each side is at least MIN_SIDE.
export function paintedBoxes(strokes: Stroke[], aspect: number): Rect[] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  let boxes = strokes.map(({ r, points }) => {
    const ry = r * aspect; // aspect = slide width / height, so the brush is round in y too
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const [x, width] = atLeast(clamp(Math.min(...xs) - r), clamp(Math.max(...xs) + r));
    const [y, height] = atLeast(clamp(Math.min(...ys) - ry), clamp(Math.max(...ys) + ry));
    return { x, y, width, height };
  });
  // Join overlapping boxes until none overlap.
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        if (overlap(boxes[i], boxes[j])) {
          boxes = [...boxes.filter((_, k) => k !== i && k !== j), union(boxes[i], boxes[j])];
          merged = true;
          break outer;
        }
  }
  return boxes.sort((a, b) => a.y - b.y || a.x - b.x); // top to bottom, like reading
}

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

const MIN_SIDE = 0.03; // of the slide

// Widen [start, end] around its middle to at least MIN_SIDE, without leaving 0..1. Returns [start, size].
function atLeast(start: number, end: number): [number, number] {
  if (end - start >= MIN_SIDE) return [start, end - start];
  const from = Math.max(0, Math.min(1 - MIN_SIDE, (start + end) / 2 - MIN_SIDE / 2));
  return [from, MIN_SIDE];
}

// Like a highlighter in GoodNotes: a stroke drawn roughly along a line of text becomes one straight, even bar
// at its average height. Circles, scribbles and strokes across several lines stay as drawn.
export function neaten(stroke: Stroke, aspect: number): Stroke {
  const { r, points } = stroke;
  if (points.length < 2) return stroke;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const wide = Math.max(...xs) - Math.min(...xs);
  const tall = (Math.max(...ys) - Math.min(...ys)) / aspect; // in the same units as wide (slide widths)
  if (wide < 3 * r || tall > Math.max(0.3 * wide, 2 * r)) return stroke; // a dot, or not along a line
  const y = ys.reduce((sum, v) => sum + v, 0) / ys.length;
  return { r, points: [{ x: Math.min(...xs), y }, { x: Math.max(...xs), y }] };
}

type Props = {
  strokes: Stroke[];
  brush: number;           // brush width in screen pixels
  pencilOnly: boolean;     // a pencil was used: fingers scroll instead of painting
  erasing: boolean;        // eraser picked: touching a stroke removes it
  onPencil: () => void;    // the first time a pencil touches the slide
  onChange: (strokes: Stroke[], boxes: Rect[], aspect: number) => void; // a stroke finished
};

// Set once Safari reports an Apple Pencil touch (touchType "stylus"); kept for the rest of the visit.
let applePencil = false;

export function PaintLayer({ strokes, brush, pencilOnly, erasing, onPencil, onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ pointer: number; stroke: Stroke } | null>(null);
  const scrolling = useRef<{ pointer: number; x: number; y: number } | null>(null); // a finger scrolling in pencil mode
  const rubbing = useRef<{ pointer: number; last: Point } | null>(null); // the pointer that is erasing, and where it was
  const live = useRef(strokes); // strokes left after erasing, before the parent re-renders
  live.current = strokes;
  const [nativeFingers, setNativeFingers] = useState(applePencil); // fingers scroll/zoom the page the browser's own way

  // Apple Pencil: stop the pencil from ever scrolling or zooming the page, so fingers can be left to the browser.
  useEffect(() => {
    const c = canvas.current!;
    const pencil = (e: TouchEvent) => {
      if (![...e.changedTouches].some(t => (t as Touch & { touchType?: string }).touchType === "stylus")) return;
      e.preventDefault();
      if (!applePencil) { applePencil = true; setNativeFingers(true); }
    };
    c.addEventListener("touchstart", pencil, { passive: false });
    c.addEventListener("touchmove", pencil, { passive: false });
    return () => { c.removeEventListener("touchstart", pencil); c.removeEventListener("touchmove", pencil); };
  }, []);

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

  // Draw all finished strokes again (after a resize, an undo, or throwing away an unfinished stroke).
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

  // Remove every stroke the eraser passed over since its last position (within the brush width plus a few pixels).
  // The path in between is checked too, so a quick swipe can't jump over a stroke.
  function eraseAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = e.currentTarget, w = c.clientWidth, h = c.clientHeight;
    const p = toSlideFraction(e, c), from = rubbing.current?.last ?? p;
    if (rubbing.current) rubbing.current.last = p;
    const steps = Math.max(1, Math.ceil(Math.hypot((p.x - from.x) * w, (p.y - from.y) * h) / 4)); // a check every 4 px
    const path = Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + (p.x - from.x) * i / steps, y: from.y + (p.y - from.y) * i / steps }));
    const near = (q: Point, a: Point, b: Point, limit: number) => distance(q.x * w, q.y * h, a.x * w, a.y * h, b.x * w, b.y * h) <= limit;
    const keep = live.current.filter(({ r, points }) =>
      !path.some(q => points.some((a, i) => near(q, points[Math.max(0, i - 1)], a, r * w + 6))));
    if (keep.length === live.current.length) return;
    live.current = keep;
    onChange(keep, paintedBoxes(keep, w / h), w / h);
  }

  // A second finger means a pinch, not painting: throw away the stroke that the first finger started.
  function dropStroke() {
    scrolling.current = null;
    if (!drawing.current) return;
    drawing.current = null;
    repaint();
  }

  function finish(e: React.PointerEvent) {
    if (scrolling.current?.pointer === e.pointerId) { scrolling.current = null; return; }
    if (rubbing.current?.pointer === e.pointerId) { rubbing.current = null; return; }
    const current = drawing.current;
    if (!current || current.pointer !== e.pointerId) return;
    drawing.current = null;
    const c = canvas.current!;
    const aspect = c.clientWidth / c.clientHeight;
    const next = [...strokes, neaten(current.stroke, aspect)];
    onChange(next, paintedBoxes(next, aspect), aspect);
  }

  return (
    <canvas
      ref={canvas}
      aria-label="Paint over the part you don't understand"
      // pinch-zoom: two fingers zoom the page, one finger paints (or scrolls in pencil mode). Apple Pencil mode: manipulation, fingers are all the browser's
      className={`absolute inset-0 h-full w-full opacity-[.55] ${pencilOnly && nativeFingers ? "touch-manipulation" : "[touch-action:pinch-zoom]"} ${erasing ? "cursor-cell" : "cursor-crosshair"}`}
      onPointerDown={e => {
        if (e.pointerType === "pen" && !pencilOnly) onPencil();
        if (pencilOnly && e.pointerType === "touch") {
          // finger in pencil mode: the browser scrolls (Apple Pencil), or we scroll for it (other pens)
          if (!nativeFingers) scrolling.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY };
          return;
        }
        if (drawing.current) { dropStroke(); return; }
        if (e.pointerType === "mouse") {
          if (e.button !== 0) return;
          e.preventDefault(); // no text selection while dragging
          e.currentTarget.setPointerCapture(e.pointerId); // keep painting if the mouse leaves the slide (touch does this anyway)
        }
        if (erasing || e.buttons & 32) { // 32 = the eraser end of a pen that has one
          rubbing.current = { pointer: e.pointerId, last: toSlideFraction(e, e.currentTarget) };
          eraseAt(e);
          return;
        }
        const zoom = window.visualViewport?.scale ?? 1;
        const r = brush / 2 / (e.currentTarget.getBoundingClientRect().width * zoom);
        const p = toSlideFraction(e, e.currentTarget);
        drawing.current = { pointer: e.pointerId, stroke: { r, points: [p] } };
        line(r, p, p);
      }}
      onPointerMove={e => {
        const s = scrolling.current;
        if (s && s.pointer === e.pointerId) {
          window.scrollBy(s.x - e.clientX, s.y - e.clientY); // window position: unaffected by the scroll itself
          scrolling.current = { ...s, x: e.clientX, y: e.clientY };
          return;
        }
        if (rubbing.current?.pointer === e.pointerId) { eraseAt(e); return; }
        const current = drawing.current;
        if (!current || current.pointer !== e.pointerId) return;
        const { r, points } = current.stroke;
        const p = toSlideFraction(e, e.currentTarget);
        line(r, points[points.length - 1], p);
        points.push(p);
      }}
      onPointerUp={finish}
      onPointerCancel={() => { rubbing.current = null; dropStroke(); }} // the browser took over (e.g. started zooming): don't keep a half stroke
    />
  );
}

// Distance in pixels from point (px, py) to the segment (ax, ay)-(bx, by).
function distance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
