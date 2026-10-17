import { categories, type Category } from "@/lib/domain";
import type { Signal } from "@/lib/api";
import { ViewResponsesButton } from "./OtherResponses";
import { ReasonPie } from "./ReasonPie";
import { otherAnswers, slideStats } from "./stats";

export type Spot = { x: number; y: number };

// Donut chart of the reasons (same colours as the summary). Under it: a button that opens the "Other" responses.
function CategoryBars({ signals, onOpenOther }: { signals: Signal[]; onOpenOther: (answers: string[]) => void }) {
  const values = slideStats(signals).categories;
  const answers = otherAnswers(signals);
  if (!categories.some((c: Category) => values[c] > 0)) return <p className="mt-2 text-sm text-gray-500">No reasons picked yet.</p>;
  return (
    <div className="mt-2">
      <ReasonPie values={values} size={96} />
      <ViewResponsesButton count={answers.length} onClick={() => onOpenOther(answers)} className="mt-2 text-xs" />
    </div>
  );
}

// Live numbers for the whole current slide. (Per-spot breakdowns are in the spot windows on the slide.)
export function StatsPanel({ signals, onOpenOther }: { signals: Signal[]; onOpenOther: (where: string, answers: string[]) => void }) {
  const all = slideStats(signals);

  return (
    <section className="rounded-2xl bg-white p-5">
      <h2 className="font-bold">Feedback on this slide</h2>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 p-2"><dt className="text-xs text-gray-600">I&apos;m Lost</dt><dd className="text-2xl font-bold">{all.lost}</dd></div>
        <div className="rounded-xl bg-gray-50 p-2"><dt className="text-xs text-gray-600">Boxes</dt><dd className="text-2xl font-bold">{all.boxes}</dd></div>
        <div className="rounded-xl bg-gray-50 p-2"><dt className="text-xs text-gray-600">Students</dt><dd className="text-2xl font-bold">{all.students}</dd></div>
      </dl>

      <div className="mt-4">
        <h3 className="text-sm font-bold">Why students boxed this slide</h3>
        <CategoryBars signals={signals} onOpenOther={a => onOpenOther("whole slide", a)} />
        {all.boxes > 0 && <p className="mt-3 text-xs text-gray-500">Point at a numbered spot on the slide to see why students marked it. Click it to keep its window open.</p>}
      </div>
      <p className="mt-3 text-xs text-gray-500">Counts are boxes, not students. One box can count in several categories.</p>
    </section>
  );
}
