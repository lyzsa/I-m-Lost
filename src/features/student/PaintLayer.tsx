"use client";
// Finger/mouse/pencil "highlighter" on top of a slide (docs/build-plan.md step B4; team choice: paint instead of dragging a box).
// Whatever the student paints, the saved selection is the neat box around it, so the contract (Rect) doesn't change.
// Put it inside <SlideView>, only while the student is in paint mode (so a stray thumb can't mark anything).
// Points are 0..1 fractions of the slide, so the paint stays on the same words when resized.
// Each separate highlighted part becomes its own box, and a stroke along a line of text is straightened into a neat bar.
// A quick tap (moves under 10 px and lifts within 0.35 s) paints nothing, so a stray touch can't make a mark:
// drag, or press and hold, to paint.
// Phones: one finger paints, two fingers pinch-zoom the page (the browser does the zooming).
// iPad with Apple Pencil: once a pencil touches the slide, only the pencil paints; fingers scroll and pinch-zoom the page
// like anywhere else in Safari (with momentum), even while the other hand is writing. Other pens: one finger scrolls.
// The brush is a size on the screen, so after zooming in the same brush covers less of the slide.
import { useEffect, useRef, useState } from "react";
import type { Rect } from "@/lib/domain";
import { toSlideFraction } from "@/components/SlideView";

export type Point = { x: number; y: number };
export type Stroke = { r: number; points: Point[] }; // r = brush radius as a fraction of the slide width
export const BRUSH_MIN = 4, BRUSH_MAX = 36, BRUSH_START = 16; // brush width in screen pixels
const PAINT = "#facc15";

// One box per highlighted part: each stroke gets its own box (grown by its brush size, kept inside the slide),
// and strokes whose boxes overlap (e.g. two passes over the same words) share one box.
// A very thin line (thin brush, a big screen, or zoomed in) still makes a box: each side is at least MIN_SIDE.
// `members` are the indexes of the strokes inside each box (used to scale a part's ink, see BoxEditor).
export type Part = { box: Rect; members: number[] };
export function paintedParts(strokes: Stroke[], aspect: number): Part[] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  let parts: Part[] = strokes.map(({ r, points }, i) => {
    const ry = r * aspect; // aspect = slide width / height, so the brush is round in y too
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const [x, width] = atLeast(clamp(Math.min(...xs) - r), clamp(Math.max(...xs) + r));
    const [y, height] = atLeast(clamp(Math.min(...ys) - ry), clamp(Math.max(...ys) + ry));
    return { box: { x, y, width, height }, members: [i] };
  });
  // Join overlapping boxes until none overlap.
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++)
        if (overlap(parts[i].box, parts[j].box)) {
          const joined = { box: union(parts[i].box, parts[j].box), members: [...parts[i].members, ...parts[j].members] };
          parts = [...parts.filter((_, k) => k !== i && k !== j), joined];
          merged = true;
          break outer;
        }
  }
  return parts.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x); // top to bottom, like reading
}

export const paintedBoxes = (strokes: Stroke[], aspect: number): Rect[] => paintedParts(strokes, aspect).map(p => p.box);

// Make some strokes bigger or smaller by `factor`, keeping `anchor` in place (ink and brush width both scale).
export function scaleStrokes(strokes: Stroke[], members: number[], anchor: Point, factor: number): Stroke[] {
  return strokes.map((s, i) => !members.includes(i) ? s : {
    r: s.r * factor,
    points: s.points.map(p => ({ x: anchor.x + (p.x - anchor.x) * factor, y: anchor.y + (p.y - anchor.y) * factor })),
  });
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

// Like a highlighter in GoodNotes: a stroke drawn along one line of text (it wobbles up and down by no more than
// about one brush width, and doesn't go back and forth) becomes one straight, even bar at its average height.
// Circles, scribbles and strokes that fill several lines stay as drawn, so their box covers everything painted.
export function neaten(stroke: Stroke, aspect: number): Stroke {
  const { r, points } = stroke;
  if (points.length < 2) return stroke;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const wide = Math.max(...xs) - Math.min(...xs);
  const tall = (Math.max(...ys) - Math.min(...ys)) / aspect; // in the same units as wide (slide widths)
  const across = points.reduce((sum, p, i) => sum + (i ? Math.abs(p.x - points[i - 1].x) : 0), 0);
  if (wide < 3 * r || tall > Math.max(2 * r, 0.025) || across > 1.5 * wide) return stroke; // a dot, a block, or back and forth
  const y = ys.reduce((sum, v) => sum + v, 0) / ys.length;
  return { r, points: [{ x: Math.min(...xs), y }, { x: Math.max(...xs), y }] };
}

type Props = {
  strokes: Stroke[];
  brush: number;           // brush width in screen pixels
  pencilOnly: boolean;     // a pencil was used: fingers scroll instead of painting
  onPencil: () => void;    // the first time a pencil touches the slide
  onChange: (strokes: Stroke[], boxes: Rect[], aspect: number) => void; // a stroke finished
};

// Set once Safari reports an Apple Pencil touch (touchType "stylus"); kept for the rest of the visit.
let applePencil = false;

export function PaintLayer({ strokes, brush, pencilOnly, onPencil, onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ pointer: number; stroke: Stroke; start: number; x: number; y: number; moved: number } | null>(null);
  const scrolling = useRef<{ pointer: number; x: number; y: number } | null>(null); // a finger scrolling in pencil mode
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

  // A second finger means a pinch, not painting: throw away the stroke that the first finger started.
  function dropStroke() {
    scrolling.current = null;
    if (!drawing.current) return;
    drawing.current = null;
    repaint();
  }

  function finish(e: React.PointerEvent) {
    if (scrolling.current?.pointer === e.pointerId) { scrolling.current = null; return; }
    const current = drawing.current;
    if (!current || current.pointer !== e.pointerId) return;
    drawing.current = null;
    if (current.moved < 10 && e.timeStamp - current.start < 350) { repaint(); return; } // a tap: not a mark
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
      className={`absolute inset-0 h-full w-full opacity-[.55] ${pencilOnly && nativeFingers ? "touch-manipulation" : "[touch-action:pinch-zoom]"} cursor-crosshair`}
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
        const zoom = window.visualViewport?.scale ?? 1;
        const r = brush / 2 / (e.currentTarget.getBoundingClientRect().width * zoom);
        const p = toSlideFraction(e, e.currentTarget);
        drawing.current = { pointer: e.pointerId, stroke: { r, points: [p] }, start: e.timeStamp, x: e.clientX, y: e.clientY, moved: 0 };
        line(r, p, p);
      }}
      onPointerMove={e => {
        const s = scrolling.current;
        if (s && s.pointer === e.pointerId) {
          window.scrollBy(s.x - e.clientX, s.y - e.clientY); // window position: unaffected by the scroll itself
          scrolling.current = { ...s, x: e.clientX, y: e.clientY };
          return;
        }
        const current = drawing.current;
        if (!current || current.pointer !== e.pointerId) return;
        const { r, points } = current.stroke;
        current.moved = Math.max(current.moved, Math.hypot(e.clientX - current.x, e.clientY - current.y));
        const p = toSlideFraction(e, e.currentTarget);
        line(r, points[points.length - 1], p);
        points.push(p);
      }}
      onPointerUp={finish}
      onPointerCancel={dropStroke} // the browser took over (e.g. started zooming): don't keep a half stroke
    />
  );
}
