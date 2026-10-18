"use client";
// The AI explanation for one saved mark (docs/build-plan.md step B5). The mark is saved before the AI is asked,
// so if the AI fails the student still finds the mark in My Review.
// "ask" = the student tapped one of their own boxes that has no explanation yet; nothing is sent until they press the button.
// text = the explanation ("done"), or why the AI failed ("error", may be empty).
export type Explain = { signalId: string; slideNumber: number; status: "ask" | "thinking" | "done" | "error"; text: string };

type Props = { explain: Explain; onExplain: () => void; onClose: () => void };

export function ExplainPanel({ explain, onExplain, onClose }: Props) {
  return (
    <section aria-live="polite" className="rounded-xl border-2 border-[#0c2b4c] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Explanation · Slide {explain.slideNumber}</h2>
        <button onClick={onClose} className="rounded-lg border border-[#c9d6e6] bg-[#eef3f9] px-4 py-2 text-sm font-bold text-[#0c2b4c] hover:bg-[#dbe5f1]">Close</button>
      </div>
      {explain.status === "ask" && (
        <>
          <p className="mt-2 text-gray-600">No explanation for this part yet.</p>
          <button onClick={onExplain} className="mt-3 w-full rounded-xl bg-[#0c2b4c] p-3 font-bold text-white">Explain this</button>
        </>
      )}
      {explain.status === "thinking" && <p className="mt-2 text-gray-600">Thinking...</p>}
      {explain.status === "done" && <p className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-wrap">{explain.text}</p>}
      {explain.status === "error" && (
        <>
          <p className="mt-2 text-red-700">Saved. Couldn&apos;t get an explanation.</p>
          {explain.text && <p className="mt-1 text-sm text-gray-600">{explain.text}</p>}
          <button onClick={onExplain} className="mt-3 w-full rounded-xl bg-[#0c2b4c] p-3 font-bold text-white">Try again</button>
        </>
      )}
    </section>
  );
}
