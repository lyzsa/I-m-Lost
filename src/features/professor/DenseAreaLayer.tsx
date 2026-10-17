import { categories } from "@/lib/domain";
import { RectBox } from "@/components/SlideView";
import type { DenseArea } from "./denseAreas";
import { ViewResponsesButton } from "./OtherResponses";

// Card placement: beside the area if there's room, otherwise inside its top-left corner.
function cardPosition(a: DenseArea): React.CSSProperties {
  const { x, y, width, height } = a.bounds;
  const below = y > 0.55; // near the bottom: grow upward from the area's bottom edge
  const top = `${(below ? y + height : y) * 100}%`;
  const dy = below ? "-100%" : "0%";
  if (x + width <= 0.72) return { left: `${(x + width) * 100}%`, top, transform: `translate(8px, ${dy})` };
  if (x >= 0.28) return { left: `${x * 100}%`, top, transform: `translate(calc(-100% - 8px), ${dy})` };
  return { left: `${x * 100}%`, top, transform: `translate(6px, ${below ? "calc(-100% - 6px)" : "6px"})` };
}

// One outline + one small reasons window per dense area, numbered busiest first.
// The windows ignore the mouse (so they never block the slide) except the "View responses" button.
export function DenseAreaLayer({ areas, onOpenResponses }: { areas: DenseArea[]; onOpenResponses: (areaNumber: number, answers: string[]) => void }) {
  return (
    <>
      {areas.map((a, i) => {
        // Only reasons that have students, busiest first, to keep these windows small (the hover window shows all 4).
        const reasons = categories.filter(c => a.reasons[c] > 0).sort((p, q) => a.reasons[q] - a.reasons[p]);
        const max = Math.max(1, ...reasons.map(c => a.reasons[c]));
        return (
          <div key={i}>
            <RectBox rect={a.bounds} className="rounded-md border-2 border-dashed border-emerald-800" />
            <div className="pointer-events-none absolute w-52 rounded-xl border bg-white/95 p-2.5 text-xs shadow-md"
              style={{ ...cardPosition(a), zIndex: 5 + areas.length - i /* busiest area's window stays on top */ }}>
              <p className="flex items-center gap-2 font-bold">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-800 text-white">{i + 1}</span>
                {a.students} {a.students === 1 ? "student" : "students"} marked here
              </p>
              <ul className="mt-1.5 space-y-1">
                {reasons.map(c => (
                  <li key={c}>
                    <div className="flex justify-between gap-2"><span>{c}</span><b>{a.reasons[c]}</b></div>
                    <div className="h-1 rounded-full bg-gray-100">
                      <div className="h-1 rounded-full bg-orange-400" style={{ width: `${(a.reasons[c] / max) * 100}%` }} />
                    </div>
                    {c === "Other" && <ViewResponsesButton count={a.otherAnswers.length} onClick={() => onOpenResponses(i + 1, a.otherAnswers)} />}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </>
  );
}

// Just the numbered outlines (no windows), for small snapshots such as the end-of-class summary.
export function ClusterOutlines({ areas }: { areas: DenseArea[] }) {
  return (
    <>
      {areas.map((a, i) => (
        <div key={i}>
          <RectBox rect={a.bounds} className="rounded-md border-2 border-dashed border-emerald-800" />
          <span className="pointer-events-none absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-800 text-xs font-bold text-white"
            style={{ left: `${a.bounds.x * 100}%`, top: `${a.bounds.y * 100}%` }}>{i + 1}</span>
        </div>
      ))}
    </>
  );
}
