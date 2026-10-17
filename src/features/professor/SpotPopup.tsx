import { atPoint, categories } from "@/lib/domain";
import type { Signal } from "@/lib/api";
import { slideStats } from "./stats";
import type { Spot } from "./StatsPanel";

// Small window that follows the pointer over the heatmap: why students boxed the area under the pointer.
// Drawn inside SlideView, so it's positioned in 0..1 fractions; it flips to stay on the slide near the edges.
export function SpotPopup({ signals, spot }: { signals: Signal[]; spot: Spot }) {
  const here = atPoint(signals, spot.x, spot.y);
  if (!here.length) return null;
  const s = slideStats(here);
  const reasons = categories.filter(c => s.categories[c] > 0).sort((a, b) => s.categories[b] - s.categories[a]);
  const max = Math.max(1, ...reasons.map(c => s.categories[c]));
  const dx = spot.x > 0.6 ? "calc(-100% - 14px)" : "14px";
  const dy = spot.y > 0.6 ? "calc(-100% - 14px)" : "14px";

  return (
    <div
      className="pointer-events-none absolute z-10 w-60 rounded-xl border bg-white/95 p-3 text-sm shadow-lg"
      style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, transform: `translate(${dx}, ${dy})` }}
    >
      <p className="font-bold">
        {here.length} {here.length === 1 ? "box" : "boxes"} here · {s.students} {s.students === 1 ? "student" : "students"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {reasons.map(c => (
          <li key={c}>
            <div className="flex justify-between gap-2"><span>{c}</span><b>{s.categories[c]}</b></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${(s.categories[c] / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
