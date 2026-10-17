"use client";
// Pops up on the student's phone when the class ends: every AI explanation this student got, slide by slide,
// then a button to My Review. Shown only if there is at least one explanation.
import Link from "next/link";
import type { Signal } from "@/lib/api";

type Props = { explained: Signal[]; reviewHref: string; onClose: () => void };

export function ClassSummary({ explained, reviewHref, onClose }: Props) {
  const sorted = [...explained].sort((a, b) => a.slideNumber - b.slideNumber || a.createdAt.localeCompare(b.createdAt));
  const reason = (s: Signal) => s.categories.map(c => (c === "Other" && s.otherText ? `"${s.otherText}"` : c)).join(" · ");
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-3 md:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-summary-title"
        onClick={e => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="class-summary-title" className="text-xl font-bold">Class ended</h2>
            <p className="text-gray-600">You asked the AI about {sorted.length} thing{sorted.length === 1 ? "" : "s"} today.</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm font-bold text-gray-600">Close</button>
        </div>
        <ol className="mt-3 flex-1 space-y-3 overflow-y-auto">
          {sorted.map(s => (
            <li key={s.id} className="rounded-xl bg-amber-50 p-3">
              <p className="text-sm font-bold">
                <span className="mr-2 rounded bg-emerald-900 px-1.5 py-0.5 text-xs text-white">Slide {s.slideNumber}</span>
                💡 {reason(s)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{s.explanation}</p>
            </li>
          ))}
        </ol>
        <Link href={reviewHref} className="mt-3 block rounded-xl bg-emerald-900 p-3 text-center font-bold text-white">Open My Review →</Link>
      </section>
    </div>
  );
}
