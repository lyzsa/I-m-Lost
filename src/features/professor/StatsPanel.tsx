import { atPoint, categories, type Category } from "@/lib/domain";
import type { Signal } from "@/lib/api";
import { ViewResponsesButton } from "./OtherResponses";
import { otherAnswers, slideStats } from "./stats";

export type Spot = { x: number; y: number };

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <>
      <div className="flex justify-between"><span>{label}</span><b>{value}</b></div>
      <div className="mt-1 h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-orange-400" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </>
  );
}

// One bar per reason. Under "Other": a button that opens the large responses window.
function CategoryBars({ signals, onOpenOther }: { signals: Signal[]; onOpenOther: (answers: string[]) => void }) {
  const values = slideStats(signals).categories;
  const max = Math.max(1, ...Object.values(values));
  const answers = otherAnswers(signals);
  return (
    <ul className="mt-2 space-y-2">
      {categories.map((c: Category) => (
        <li key={c} className="text-sm">
          <Bar label={c} value={values[c]} max={max} />
          {c === "Other" && <ViewResponsesButton count={answers.length} onClick={() => onOpenOther(answers)} className="mt-1 text-xs" />}
        </li>
      ))}
    </ul>
  );
}

// Live numbers for the current slide, plus the boxes under the spot the professor clicked.
export function StatsPanel({ signals, spot, onClearSpot, onOpenOther }: {
  signals: Signal[]; spot?: Spot; onClearSpot: () => void; onOpenOther: (where: string, answers: string[]) => void;
}) {
  const all = slideStats(signals);
  const atSpot = spot ? atPoint(signals, spot.x, spot.y) : null;

  return (
    <section className="rounded-2xl bg-white p-5">
      <h2 className="font-bold">Feedback on this slide</h2>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 p-2"><dt className="text-xs text-gray-600">I&apos;m Lost</dt><dd className="text-2xl font-bold">{all.lost}</dd></div>
        <div className="rounded-xl bg-gray-50 p-2"><dt className="text-xs text-gray-600">Boxes</dt><dd className="text-2xl font-bold">{all.boxes}</dd></div>
        <div className="rounded-xl bg-gray-50 p-2"><dt className="text-xs text-gray-600">Students</dt><dd className="text-2xl font-bold">{all.students}</dd></div>
      </dl>

      {atSpot ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold">At the spot you clicked: {atSpot.length} {atSpot.length === 1 ? "box" : "boxes"}</h3>
            <button className="text-sm text-emerald-800 underline" onClick={onClearSpot}>Show whole slide</button>
          </div>
          <CategoryBars signals={atSpot} onOpenOther={a => onOpenOther("the spot you clicked", a)} />
        </div>
      ) : (
        <div className="mt-4">
          <h3 className="text-sm font-bold">Why students boxed this slide</h3>
          <CategoryBars signals={signals} onOpenOther={a => onOpenOther("whole slide", a)} />
          {all.boxes > 0 && <p className="mt-3 text-xs text-gray-500">Point at a dark area on the slide to see why students boxed it. Click to pin it here.</p>}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">Counts are boxes, not students. One box can count in several categories.</p>
    </section>
  );
}
