"use client";
import { useState } from "react";
import Link from "next/link";
import { updateLive, type Session } from "@/lib/api";
import { nextLiveStep } from "./liveStep";

const PHASE_LABEL = { presenting: "Presenting", reviewing: "Reviewing feedback", ended: "Class ended" } as const;

// The one main button. Disabled while saving, and the new state is applied right away,
// so a double-click can never skip a slide even if the live update arrives late.
export function LiveControls({ session, onChange }: { session: Session; onChange: (s: Session) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const step = nextLiveStep(session);

  async function go() {
    if (!step || busy) return;
    setBusy(true);
    setError("");
    try {
      await updateLive(session.id, step.slide, step.phase);
      onChange({ ...session, currentSlide: step.slide, phase: step.phase });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the class. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5">
      <p className="text-sm text-gray-600">
        Slide {session.currentSlide} of {session.slides.length} · <b>{PHASE_LABEL[session.phase]}</b>
      </p>
      {step && (
        <button className="mt-3 w-full rounded-xl bg-emerald-900 p-4 text-lg text-white" disabled={busy} onClick={go}>
          {busy ? "Saving..." : step.label}
        </button>
      )}
      {session.phase === "ended" && (
        <div className="mt-3 space-y-2">
          <Link href={`/host/${session.id}/summary`} className="block w-full rounded-xl bg-emerald-900 p-4 text-center text-lg text-white">View summary</Link>
          <Link href="/" className="block w-full rounded-xl border-2 border-emerald-900 p-3 text-center text-emerald-900">Back to home</Link>
        </div>
      )}
      {session.phase === "presenting" && <p className="mt-2 text-xs text-gray-500">Review shows students&apos; feedback before you move on.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
