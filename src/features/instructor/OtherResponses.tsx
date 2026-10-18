"use client";
// The large "Other" responses window: one card per student response, full text, no extra clicks.
// Opened from the "View responses" buttons (stats panel, dense-area windows, summary). Anonymous: no names.
import { useEffect } from "react";

export type ResponsesView = { title: string; answers: string[] };

export function OtherResponsesModal({ view, onClose }: { view: ResponsesView; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Other responses"
        className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl bg-[#faf9f7] shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b bg-white px-6 py-4 rounded-t-2xl">
          <div>
            <p className="text-sm font-bold tracking-widest text-[#3a6596]">&ldquo;OTHER&rdquo; RESPONSES</p>
            <h2 className="text-2xl font-bold">{view.title}</h2>
            <p className="text-sm text-gray-600">
              {view.answers.length} {view.answers.length === 1 ? "response" : "responses"} in students&apos; own words · anonymous
            </p>
          </div>
          <button className="rounded-xl bg-[#0c2b4c] px-4 py-2 font-bold text-white" onClick={onClose} autoFocus>Close</button>
        </header>
        <div className="overflow-y-auto p-6">
          {view.answers.length ? (
            <ol className="grid gap-4 sm:grid-cols-2">
              {view.answers.map((a, i) => (
                <li key={i} className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold tracking-widest text-gray-500">RESPONSE {i + 1}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-lg">&ldquo;{a}&rdquo;</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-600">These students picked Other without typing a reason.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Small "View N responses →" button used under every "Other" row.
export function ViewResponsesButton({ count, onClick, className = "" }: { count: number; onClick: () => void; className?: string }) {
  if (!count) return null;
  return (
    <button
      className={`pointer-events-auto font-bold text-[#0c2b4c] underline ${className}`}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      View {count} {count === 1 ? "response" : "responses"} →
    </button>
  );
}
