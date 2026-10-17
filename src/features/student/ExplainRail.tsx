"use client";
// A narrow strip to the right of a slide with one 💡 per AI explanation, at the same height as its orange box
// (like comments in the margin of a document). Tapping a 💡 opens that explanation.
// Put it next to <SlideView> in a flex row: <div className="flex gap-1.5"><SlideView className="min-w-0 flex-1" .../><ExplainRail .../></div>
// Two boxes at about the same height would put their 💡 on top of each other, so the lower one is pushed down a little.
import { useEffect, useRef, useState } from "react";
import type { Signal } from "@/lib/api";

const ICON = 28; // px, one 💡 button

type Props = {
  marks: Signal[];                 // this slide's marks that have an explanation (and a box)
  activeId?: string | null;        // the mark whose explanation is open
  disabled?: boolean;              // while painting
  onOpen: (mark: Signal) => void;
};

export function ExplainRail({ marks, activeId, disabled, onOpen }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Centre of each box, top to bottom, then spaced out so no two 💡 overlap and none falls off the bottom.
  const sorted = [...marks].sort((a, b) => a.rect!.y + a.rect!.height / 2 - (b.rect!.y + b.rect!.height / 2));
  const tops: number[] = [];
  sorted.forEach((m, i) => {
    const want = (m.rect!.y + m.rect!.height / 2) * height - ICON / 2;
    tops.push(Math.max(0, want, i ? tops[i - 1] + ICON + 2 : 0));
  });
  const overflow = tops.length ? tops[tops.length - 1] + ICON - height : 0;
  if (overflow > 0) for (let i = tops.length - 1, limit = height - ICON; i >= 0; i--, limit -= ICON + 2) tops[i] = Math.max(0, Math.min(tops[i], limit));

  return (
    <div ref={rail} className="relative w-8 shrink-0" aria-label="AI explanations on this slide">
      {height > 0 && sorted.map((m, i) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onOpen(m)}
          disabled={disabled}
          title="💡 AI explanation"
          aria-label="💡 AI explanation"
          aria-pressed={activeId === m.id}
          className={`absolute left-0.5 grid h-7 w-7 place-items-center rounded-full text-base leading-none shadow-sm transition disabled:opacity-40 ${activeId === m.id ? "bg-orange-500 ring-2 ring-orange-300" : "bg-amber-100 hover:bg-amber-200"}`}
          style={{ top: tops[i] }}
        >
          💡
        </button>
      ))}
    </div>
  );
}
