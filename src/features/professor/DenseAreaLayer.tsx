import { categories } from "@/lib/domain";
import { RectBox } from "@/components/SlideView";
import type { DenseArea } from "./denseAreas";
import { ViewResponsesButton } from "./OtherResponses";

// A spot's identity that survives re-renders (its position on the slide), so a pinned window stays pinned.
export const areaKey = (a: DenseArea) => `${a.bounds.x.toFixed(4)},${a.bounds.y.toFixed(4)}`;

// The spot under a point (0..1 slide fractions), busiest first if outlines overlap.
export function areaAt(areas: DenseArea[], x: number, y: number): DenseArea | undefined {
  return areas.find(a => x >= a.bounds.x && x <= a.bounds.x + a.bounds.width && y >= a.bounds.y && y <= a.bounds.y + a.bounds.height);
}

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

type Props = {
  areas: DenseArea[];
  hovered?: string;                 // key of the spot under the mouse (its window shows while hovered)
  pinned: string[];                 // keys of spots clicked open (their windows stay)
  onUnpin: (key: string) => void;
  onOpenResponses: (areaNumber: number, answers: string[]) => void;
};

// Numbered outline for every confusion spot; a reasons window only for the hovered spot and for pinned spots.
// Hover windows ignore the mouse; pinned windows have a close button and "View responses".
export function DenseAreaLayer({ areas, hovered, pinned, onUnpin, onOpenResponses }: Props) {
  return (
    <>
      {areas.map((a, i) => {
        const key = areaKey(a);
        const isPinned = pinned.includes(key);
        const open = isPinned || hovered === key;
        // Only reasons that have students, busiest first, to keep these windows small.
        const reasons = categories.filter(c => a.reasons[c] > 0).sort((p, q) => a.reasons[q] - a.reasons[p]);
        const max = Math.max(1, ...reasons.map(c => a.reasons[c]));
        return (
          <div key={key}>
            <RectBox rect={a.bounds}
              className={`rounded-md border-2 border-dashed ${open ? "border-emerald-900 bg-emerald-900/5" : "border-emerald-800"}`} />
            <span className="pointer-events-none absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-800 text-xs font-bold text-white"
              style={{ left: `${a.bounds.x * 100}%`, top: `${a.bounds.y * 100}%` }}>{i + 1}</span>
            {open && (
              <div className={`absolute w-56 rounded-xl border bg-white p-2.5 text-xs shadow-lg ${isPinned ? "pointer-events-auto" : "pointer-events-none"}`}
                style={{ ...cardPosition(a), zIndex: isPinned ? 20 : 30 /* the one you're pointing at is on top */ }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 font-bold">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-800 text-white">{i + 1}</span>
                  <span className="flex-1">{a.students} {a.students === 1 ? "student" : "students"} marked here</span>
                  {isPinned && (
                    <button aria-label={`Close spot ${i + 1}`} className="grid h-5 w-5 place-items-center rounded text-gray-500 hover:bg-gray-100"
                      onClick={() => onUnpin(key)}>✕</button>
                  )}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {reasons.map(c => (
                    <li key={c}>
                      <div className="flex justify-between gap-2"><span>{c}</span><b>{a.reasons[c]}</b></div>
                      <div className="h-1 rounded-full bg-gray-100">
                        <div className="h-1 rounded-full bg-orange-400" style={{ width: `${(a.reasons[c] / max) * 100}%` }} />
                      </div>
                      {c === "Other" && isPinned && (
                        <ViewResponsesButton count={a.otherAnswers.length} onClick={() => onOpenResponses(i + 1, a.otherAnswers)} />
                      )}
                    </li>
                  ))}
                </ul>
                {!isPinned && <p className="mt-1.5 text-gray-500">Click the spot to keep this open{a.otherAnswers.length ? " and read responses" : ""}.</p>}
              </div>
            )}
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
