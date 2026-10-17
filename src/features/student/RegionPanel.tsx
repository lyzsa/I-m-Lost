"use client";
// After painting: pick why it's confusing, then Save for Later or Explain Now (PLAN.md steps B4, B5).
// Both buttons save first. The id is made once when the panel opens, so "Try again" can't create a duplicate.
import { useState } from "react";
import { submitSignal, type Signal } from "@/lib/api";
import { categories, type Category, type Rect } from "@/lib/domain";

type Props = {
  sessionId: string;
  slideNumber: number;
  rect: Rect;
  onSaved: (signal: Signal, wantsExplanation: boolean) => void;
  onClear: () => void; // erase the paint and start over
};

export function RegionPanel({ sessionId, slideNumber, rect, onSaved, onClear }: Props) {
  const [id] = useState(() => crypto.randomUUID());
  const [picked, setPicked] = useState<Category[]>([]);
  const [saving, setSaving] = useState<"save" | "explain" | null>(null);
  const [error, setError] = useState("");

  async function save(wantsExplanation: boolean) {
    setSaving(wantsExplanation ? "explain" : "save");
    setError("");
    try {
      onSaved(await submitSignal({ id, sessionId, slideNumber, kind: "region", rect, categories: picked }), wantsExplanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setSaving(null);
    }
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">Why is this confusing?</h2>
      <div className="mt-2 grid gap-2">
        {categories.map(c => (
          <label key={c} className={`flex items-center gap-3 rounded-lg border-2 p-3 ${picked.includes(c) ? "border-emerald-700 bg-emerald-50" : "border-gray-200"}`}>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={picked.includes(c)}
              onChange={() => setPicked(p => (p.includes(c) ? p.filter(x => x !== c) : [...p, c]))}
            />
            {c}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">Couldn&apos;t save: {error}. Try again.</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => save(false)} disabled={!!saving || !picked.length} className="rounded-xl bg-emerald-900 p-3 font-bold text-white">
          {saving === "save" ? "Saving..." : "Save for Later"}
        </button>
        <button onClick={() => save(true)} disabled={!!saving || !picked.length} className="rounded-xl border-2 border-emerald-900 p-3 font-bold text-emerald-900">
          {saving === "explain" ? "Saving..." : "Explain Now"}
        </button>
      </div>
      {!picked.length && <p className="mt-2 text-center text-sm text-gray-600">Pick at least one reason.</p>}
      <button onClick={onClear} disabled={!!saving} className="mt-2 w-full p-2 text-sm font-bold text-gray-600 underline">
        Clear and paint again
      </button>
    </section>
  );
}
