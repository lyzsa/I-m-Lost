"use client";
// The AI explanation for one saved mark (PLAN.md step B5). The mark is saved before the AI is asked,
// so if the AI fails the student still finds the mark in My Review.
export type Explain = { signalId: string; slideNumber: number; status: "thinking" | "done" | "error"; text: string };

type Props = { explain: Explain; onRetry: () => void; onClose: () => void };

export function ExplainPanel({ explain, onRetry, onClose }: Props) {
  return (
    <section aria-live="polite" className="rounded-xl border-2 border-emerald-900 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Explanation · Slide {explain.slideNumber}</h2>
        <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm font-bold text-gray-600">Close</button>
      </div>
      {explain.status === "thinking" && <p className="mt-2 text-gray-600">Thinking...</p>}
      {explain.status === "done" && <p className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-wrap">{explain.text}</p>}
      {explain.status === "error" && (
        <>
          <p className="mt-2 text-red-700">Saved. Couldn&apos;t get an explanation.</p>
          <button onClick={onRetry} className="mt-3 w-full rounded-xl bg-emerald-900 p-3 font-bold text-white">Try again</button>
        </>
      )}
    </section>
  );
}
