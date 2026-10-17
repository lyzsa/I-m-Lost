"use client";
// The dashed box around each highlighted part, with a handle on its bottom-right corner (like a GoodNotes lasso):
// dragging the handle makes the part's ink bigger or smaller, and the box follows. The top-left corner stays put.
// Put it inside <SlideView> after the PaintLayer, so the handles are on top. Only the handles catch touches;
// everywhere else the paint layer underneath still paints.
import { useRef } from "react";
import { RectBox, toSlideFraction } from "@/components/SlideView";
import { paintedParts, scaleStrokes, type Point, type Stroke } from "@/features/student/PaintLayer";

type Props = {
  strokes: Stroke[];
  aspect: number; // slide width / height
  onChange: (strokes: Stroke[]) => void;
};

export function BoxEditor({ strokes, aspect, onChange }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  // While dragging: the strokes as they were when the drag started, which ones to scale, and from where.
  const drag = useRef<{ pointer: number; start: Stroke[]; members: number[]; anchor: Point; from: number } | null>(null);

  // Distance from the anchor in screen pixels, so the scale is the same however the slide is shaped.
  function reach(p: Point, anchor: Point) {
    const r = layer.current!.getBoundingClientRect();
    return Math.hypot((p.x - anchor.x) * r.width, (p.y - anchor.y) * r.height);
  }

  function scale(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId || !layer.current) return;
    const factor = Math.max(0.2, Math.min(5, reach(toSlideFraction(e, layer.current), d.anchor) / d.from));
    onChange(scaleStrokes(d.start, d.members, d.anchor, factor));
  }

  return (
    <div ref={layer} className="pointer-events-none absolute inset-0">
      {paintedParts(strokes, aspect).map(({ box, members }) => (
        <div key={members.join(",")}>
          <RectBox rect={box} className="rounded-sm border-2 border-dashed border-orange-600" />
          <div
            role="button"
            aria-label="Drag to make this part bigger or smaller"
            className="pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none place-items-center rounded-full border-2 border-orange-600 bg-white text-sm leading-none text-orange-700 shadow"
            style={{ left: `${(box.x + box.width) * 100}%`, top: `${(box.y + box.height) * 100}%` }}
            onPointerDown={e => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              const anchor = { x: box.x, y: box.y };
              drag.current = { pointer: e.pointerId, start: strokes, members, anchor, from: Math.max(1, reach({ x: box.x + box.width, y: box.y + box.height }, anchor)) };
            }}
            onPointerMove={scale}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
          >
            ⤡
          </div>
        </div>
      ))}
    </div>
  );
}
