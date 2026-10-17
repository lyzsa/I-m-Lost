// Donut chart of why students marked a cluster. Slices are reasons picked (a student can pick several), so the
// legend always shows each reason's count in text: colour is never the only cue. Each reason keeps the same colour
// everywhere. Palette checked for colour-blind separation with the dataviz validator (blue, orange, aqua, violet).
import { categories, type Category } from "@/lib/domain";

export const REASON_COLORS: Record<Category, string> = {
  "I don’t understand": "#2a78d6",
  "Need an example": "#eb6834",
  "Why does this work?": "#1baf7a",
  "Other": "#4a3aa7",
};

const R = 40;                       // ring radius
const C = 2 * Math.PI * R;          // ring length
const GAP = 2;                      // gap between slices, along the ring

export function ReasonPie({ values, size = 112 }: { values: Record<Category, number>; size?: number }) {
  const shown = categories.filter(c => values[c] > 0);
  const total = shown.reduce((sum, c) => sum + values[c], 0);
  if (!total) return null;

  let offset = 0;
  const slices = shown.map(c => {
    const length = (values[c] / total) * C;
    const slice = { c, length, offset };
    offset += length;
    return slice;
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0 -rotate-90" role="img"
        aria-label={shown.map(c => `${c}: ${values[c]}`).join(", ")}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e5e7eb" strokeWidth="16" />
        {slices.map(({ c, length, offset }) => (
          <circle key={c} cx="50" cy="50" r={R} fill="none" stroke={REASON_COLORS[c]} strokeWidth="16"
            strokeDasharray={`${Math.max(0, length - (slices.length > 1 ? GAP : 0))} ${C}`} strokeDashoffset={-offset}>
            <title>{`${c}: ${values[c]} of ${total} reasons picked (${Math.round((values[c] / total) * 100)}%)`}</title>
          </circle>
        ))}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {[...shown].sort((a, b) => values[b] - values[a]).map(c => (
          <li key={c} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: REASON_COLORS[c] }} />
            <span>{c}</span>
            <b className="tabular-nums">{values[c]}</b>
            <span className="text-gray-500 tabular-nums">({Math.round((values[c] / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
