"use client";
// I'm Lost (PLAN.md step B3): one tap = "I'm lost on this slide". No box, no categories.
// A failed save keeps the same id, so "Try again" can't count twice.
// Render it with key={slideNumber} so it starts fresh on every slide.
import { useState } from "react";
import { submitSignal, type Signal } from "@/lib/api";

const ALREADY = "You already tapped I'm Lost on this slide"; // exact message from PLAN.md section 4.2

type Props = { sessionId: string; slideNumber: number; done: boolean; onSaved: (signal: Signal) => void };

export function LostButton({ sessionId, slideNumber, done, onSaved }: Props) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(done ? "saved" : "idle");
  const [failedId, setFailedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function send(id: string) {
    setState("saving");
    setMessage("");
    try {
      onSaved(await submitSignal({ id, sessionId, slideNumber, kind: "lost", categories: [] }));
      setState("saved");
      setFailedId(null);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Couldn't save";
      if (text === ALREADY) { setState("saved"); setMessage(ALREADY); return; }
      setState("error");
      setMessage(text);
      setFailedId(id); // "Try again" resends this same id
    }
  }

  return (
    <div>
      <button
        onClick={() => send(failedId ?? crypto.randomUUID())}
        disabled={state === "saving"}
        className="w-full rounded-xl bg-emerald-900 p-4 text-xl font-bold text-white"
      >
        {state === "saving" ? "Saving..." : state === "error" ? "Try again" : state === "saved" ? "I'm Lost ✓" : "I'm Lost"}
      </button>
      <p role="status" className={`mt-2 text-center text-sm ${state === "error" ? "text-red-700" : "text-gray-600"}`}>
        {state === "error" ? `Couldn't save: ${message}`
          : message ? message
          : state === "saved" ? "Saved. Your professor sees the count, never your name."
          : "Tap if this slide lost you."}
      </p>
    </div>
  );
}
