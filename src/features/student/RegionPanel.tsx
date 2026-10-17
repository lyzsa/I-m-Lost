"use client";
// After painting: optionally pick why it's confusing, then Save for Later or Explain Now (PLAN.md steps B4, B5).
// Both buttons save first. The id is made once when the panel opens, so "Try again" can't create a duplicate.
// Picking "Other" asks for the student's own words (otherText, 1-200 characters, required only then).
// Reasons are optional for the student. The shared rules still need at least one, so picking nothing is saved
// as the most general reason, "I don't understand" (categories[0]).
import { useState } from "react";
import { submitSignal, type Signal } from "@/lib/api";
import { categories, type Category, type Rect } from "@/lib/domain";

type Props = {
  sessionId: string;
  slideNumber: number;
  rect: Rect;
  onSaved: (signal: Signal, wantsExplanation: boolean) => void;
};

export function RegionPanel({ sessionId, slideNumber, rect, onSaved }: Props) {
  const [id] = useState(() => crypto.randomUUID());
  const [picked, setPicked] = useState<Category[]>([]);
  const [otherText, setOtherText] = useState("");
  const [saving, setSaving] = useState<"save" | "explain" | null>(null);
  const [error, setError] = useState("");
  const wantsOther = picked.includes("Other");
  const ready = !wantsOther || otherText.trim() !== "";

  async function save(wantsExplanation: boolean) {
    setSaving(wantsExplanation ? "explain" : "save");
    setError("");
    try {
      const signal = await submitSignal({
        id, sessionId, slideNumber, kind: "region", rect,
        categories: picked.length ? picked : [categories[0]], // nothing picked = "I don't understand"
        otherText: wantsOther ? otherText.trim() : undefined, // only sent with "Other"
      });
      onSaved(signal, wantsExplanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setSaving(null);
    }
  }

  return (
    <section className="rounded-xl bg-white p-3 shadow-sm">
      <h2 className="font-bold">Why is this confusing? <span className="font-normal text-gray-500">(optional)</span></h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {categories.map(c => (
          <label key={c} className={`flex items-center gap-2 rounded-lg border-2 p-2 text-sm ${picked.includes(c) ? "border-emerald-700 bg-emerald-50" : "border-gray-200"}`}>
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0"
              checked={picked.includes(c)}
              onChange={() => setPicked(p => (p.includes(c) ? p.filter(x => x !== c) : [...p, c]))}
            />
            {c}
          </label>
        ))}
      </div>
      {wantsOther && (
        <input
          value={otherText}
          onChange={e => setOtherText(e.target.value)}
          maxLength={200} // same limit as the contract (OTHER_TEXT_MAX)
          placeholder="What's confusing?"
          aria-label="What's confusing? (your own words)"
          autoFocus
          className="mt-2 w-full rounded-lg border-2 border-emerald-700 p-2 text-sm focus:outline-none"
        />
      )}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">Couldn&apos;t save: {error}. Try again.</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => save(false)} disabled={!!saving || !ready} className="rounded-xl bg-emerald-900 p-3 font-bold text-white">
          {saving === "save" ? "Saving..." : "Save for Later"}
        </button>
        <button onClick={() => save(true)} disabled={!!saving || !ready} className="rounded-xl border-2 border-emerald-900 p-3 font-bold text-emerald-900">
          {saving === "explain" ? "Saving..." : "Explain Now"}
        </button>
      </div>
      {!ready && <p className="mt-2 text-sm text-gray-600">Write what&apos;s confusing.</p>}
    </section>
  );
}
