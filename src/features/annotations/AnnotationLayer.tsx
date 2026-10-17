"use client";
// Draws the instructor's pen strokes on top of a slide. Put it inside <SlideView>.
// Points are 0..1 fractions of the slide and line width is a fraction of the slide width, so the strokes stay on
// the same words and keep the same thickness on a phone, a laptop and the projector. Never catches clicks or touches.
import { useEffect, useRef, useState } from "react";
import type { Annotation } from "@/lib/api";

type Stroke = Pick<Annotation, "id" | "points" | "color" | "width">;

export function AnnotationLayer({ annotations }: { annotations: Stroke[] }) {
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { w, h } = size;
  return (
    <svg ref={svg} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {w > 0 && annotations.map(a => {
        const strokeWidth = Math.max(1, a.width * w);
        return a.points.length === 1 ? (
          <circle key={a.id} cx={a.points[0].x * w} cy={a.points[0].y * h} r={strokeWidth / 2} fill={a.color} />
        ) : (
          <polyline key={a.id} points={a.points.map(p => `${p.x * w},${p.y * h}`).join(" ")}
            fill="none" stroke={a.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
    </svg>
  );
}
