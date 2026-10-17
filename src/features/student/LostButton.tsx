"use client";
// I'm Lost (PLAN.md step B3): one tap = "I'm lost on this slide". No box, no categories.
// A failed save keeps the same id, so "Try again" can't count twice.
// Render it with key={slideNumber} so it starts fresh on every slide. Its messages go to onStatus,
// so the page can show them in one line above the floating buttons.
import { useState } from "react";
import { submitSignal, type Signal } from "@/lib/api";

const ALREADY = "You already tapped I'm Lost on this slide"; // exact message from PLAN.md section 4.2

type Props = {
  sessionId: string;
  slideNumber: number;
  done: boolean;
  onSaved: (signal: Signal) => void;
  onStatus: (text: string, isError: boolean) => void;
};

export function LostButton({ sessionId, slideNumber, done, onSaved, onStatus }: Props) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(done ? "saved" : "idle");
  const [failedId, setFailedId] = useState<string | null>(null);

  async function send(id: string) {
    setState("saving");
    try {
      onSaved(await submitSignal({ id, sessionId, slideNumber, kind: "lost", categories: [] }));
      setState("saved");
      setFailedId(null);
      onStatus("Saved. Your professor sees the count, never your name.", false);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Couldn't save";
      if (text === ALREADY) { setState("saved"); onStatus(ALREADY, false); return; }
      setState("error");
      setFailedId(id); // "Try again" resends this same id
      onStatus(`Couldn't save: ${text}`, true);
    }
  }

  return (
    <button
      onClick={() => send(failedId ?? crypto.randomUUID())}
      disabled={state === "saving"}
      className="w-full rounded-xl bg-emerald-900 p-3 text-xl font-bold text-white"
    >
      {state === "saving" ? "Saving..." : state === "error" ? "Try again" : state === "saved" ? "I'm Lost ✓" : "I'm Lost"}
    </button>
  );
}
