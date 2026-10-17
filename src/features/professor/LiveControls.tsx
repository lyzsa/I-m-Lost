"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateLive, type Session } from "@/lib/api";
import { nextLiveStep } from "./liveStep";

const PHASE_LABEL = { presenting: "Presenting", reviewing: "Reviewing feedback", ended: "Class ended" } as const;

// The one main button. Disabled while saving, and the new state is applied right away,
// so a double-click can never skip a slide even if the live update arrives late.
// "End class now" ends the class from any slide (after a confirm), then opens the summary.
export function LiveControls({ session, onChange }: { session: Session; onChange: (s: Session) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const step = nextLiveStep(session);

  async function moveTo(slide: number, phase: Session["phase"]) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await updateLive(session.id, slide, phase);
      onChange({ ...session, currentSlide: slide, phase });
      if (phase === "ended") router.push(`/host/${session.id}/summary`); // class over: straight to the summary
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the class. Try again.");
    } finally {
      setBusy(false);
      setConfirmingEnd(false);
    }
  }
  const go = () => { if (step) moveTo(step.slide, step.phase); };
  const endNow = () => moveTo(session.currentSlide, "ended");

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
      {step && step.phase !== "ended" && (
        confirmingEnd ? (
          <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-sm">
            <p className="font-bold">End the class for everyone now?</p>
            <p className="text-gray-600">Students will see &quot;Class ended&quot;. You&apos;ll go to the summary.</p>
            <div className="mt-2 flex gap-2">
              <button className="flex-1 rounded-lg bg-red-700 p-2 font-bold text-white" disabled={busy} onClick={endNow}>
                {busy ? "Ending..." : "Yes, end class"}
              </button>
              <button className="flex-1 rounded-lg border-2 border-gray-300 bg-white p-2" disabled={busy} onClick={() => setConfirmingEnd(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="mt-3 w-full rounded-xl border-2 border-red-200 p-2 text-sm text-red-800 hover:bg-red-50" disabled={busy}
            onClick={() => setConfirmingEnd(true)}>
            End class now
          </button>
        )
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
