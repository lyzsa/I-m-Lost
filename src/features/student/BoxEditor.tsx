"use client";
// The dashed boxes around what the student highlighted, with a handle on each corner to make a box bigger or smaller
// (like resizing a selection in GoodNotes). Put it inside <SlideView> after the PaintLayer, so the handles are on top.
// Only the handles catch touches; everywhere else the paint layer underneath still paints.
// Painting another stroke recalculates the boxes from the paint, so resize when you're done painting.
import { useRef } from "react";
import type { Rect } from "@/lib/domain";
import { RectBox, toSlideFraction } from "@/components/SlideView";

const MIN_SIDE = 0.02; // of the slide
const CORNERS = ["nw", "ne", "sw", "se"] as const;
type Corner = (typeof CORNERS)[number];

export function BoxEditor({ boxes, onChange }: { boxes: Rect[]; onChange: (boxes: Rect[]) => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; index: number; corner: Corner } | null>(null);

  // Move the dragged corner to the pointer; the opposite corner stays put.
  function resize(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId || !layer.current) return;
    const p = toSlideFraction(e, layer.current);
    const b = boxes[d.index];
    let x1 = b.x, y1 = b.y, x2 = b.x + b.width, y2 = b.y + b.height;
    if (d.corner[1] === "w") x1 = Math.min(p.x, x2 - MIN_SIDE); else x2 = Math.max(p.x, x1 + MIN_SIDE);
    if (d.corner[0] === "n") y1 = Math.min(p.y, y2 - MIN_SIDE); else y2 = Math.max(p.y, y1 + MIN_SIDE);
    onChange(boxes.map((box, i) => (i === d.index ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : box)));
  }

  return (
    <div ref={layer} className="pointer-events-none absolute inset-0">
      {boxes.map((b, i) => (
        <div key={i}>
          <RectBox rect={b} className="rounded-sm border-2 border-dashed border-orange-600" />
          {CORNERS.map(corner => (
            <div
              key={corner}
              role="button"
              aria-label="Drag to resize this box"
              className="pointer-events-auto absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none rounded-full border-2 border-orange-600 bg-white shadow"
              style={{
                left: `${(corner[1] === "w" ? b.x : b.x + b.width) * 100}%`,
                top: `${(corner[0] === "n" ? b.y : b.y + b.height) * 100}%`,
              }}
              onPointerDown={e => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { pointer: e.pointerId, index: i, corner };
              }}
              onPointerMove={resize}
              onPointerUp={() => { drag.current = null; }}
              onPointerCancel={() => { drag.current = null; }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
