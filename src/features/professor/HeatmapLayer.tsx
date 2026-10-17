import { RectBox } from "@/components/SlideView";
import type { Signal } from "@/lib/api";

// Every student's box, drawn see-through. Where boxes overlap the colors stack, so busy areas look darker.
// "I'm Lost" taps have no box, so they never add heat.
export function HeatmapLayer({ signals }: { signals: Signal[] }) {
  return (
    <>
      {signals.map(s => s.kind === "region" && s.rect
        ? <RectBox key={s.id} rect={s.rect} className="bg-orange-500/25" />
        : null)}
    </>
  );
}
