"use client";
// Prev / slide thumbnails / Next under the student's slide (same look as the instructor's SlideNav).
// Unlike the instructor's, it only changes what THIS phone shows; the class doesn't move.
// The slide on screen has a green border, the class's live slide has a "LIVE" tag,
// and slides where the student marked something have an orange dot.
import { useEffect, useRef } from "react";
import type { Slide } from "@/lib/api";

type Props = {
  slides: Slide[];
  shown: number;          // the slide this phone shows
  live: number | null;    // the class's slide (null after class ends)
  marked: Set<number>;    // slides where this student saved I'm Lost or a box
  disabled: boolean;      // while painting, the slide is held still
  onGo: (slideNumber: number) => void;
};

export function SlideStrip({ slides, shown, live, marked, disabled, onGo }: Props) {
  const strip = useRef<HTMLOListElement>(null);

  // Keep the shown slide's thumbnail in view. Scrolls only the strip sideways, never the page.
  useEffect(() => {
    const list = strip.current;
    const item = list?.children[shown - 1] as HTMLElement | undefined;
    if (!list || !item) return;
    const left = item.offsetLeft, right = left + item.offsetWidth;
    if (left < list.scrollLeft) list.scrollTo({ left: left - 8, behavior: "smooth" });
    else if (right > list.scrollLeft + list.clientWidth) list.scrollTo({ left: right - list.clientWidth + 8, behavior: "smooth" });
  }, [shown]);

  const total = slides.length;
  return (
    <nav aria-label="Slides" className="mt-3 rounded-2xl bg-white p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <button className="shrink-0 rounded-lg bg-gray-100 px-3 py-4 font-bold" disabled={disabled || shown <= 1}
          onClick={() => onGo(shown - 1)}>‹ Prev</button>
        <ol ref={strip} className="relative flex flex-1 gap-2 overflow-x-auto py-1">
          {slides.map(s => {
            const current = s.number === shown;
            return (
              <li key={s.number} className="shrink-0">
                <button
                  className={`relative block h-12 w-20 overflow-hidden rounded-md border-2 bg-gray-100 md:h-14 md:w-24 ${current ? "border-[#24507f]" : "border-transparent hover:border-gray-300"}`}
                  disabled={disabled} aria-current={current ? "page" : undefined}
                  aria-label={`Slide ${s.number}${s.number === live ? " (class is here)" : ""}`}
                  onClick={() => onGo(s.number)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt="" loading="lazy" className="block h-full w-full object-contain" draggable={false} />
                  <span className={`absolute bottom-0.5 left-0.5 rounded px-1 text-xs font-bold ${current ? "bg-[#24507f] text-white" : "bg-white/90"}`}>{s.number}</span>
                  {s.number === live && <span className="absolute top-0.5 left-0.5 rounded bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">LIVE</span>}
                  {marked.has(s.number) && <span aria-hidden className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />}
                </button>
              </li>
            );
          })}
        </ol>
        <button className="shrink-0 rounded-lg bg-gray-100 px-3 py-4 font-bold" disabled={disabled || shown >= total}
          onClick={() => onGo(shown + 1)}>Next ›</button>
      </div>
    </nav>
  );
}
