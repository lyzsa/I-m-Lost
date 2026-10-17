"use client";
import { useState } from "react";
import { updateLive, type Session } from "@/lib/api";

// Move freely: previous / next, or jump to any slide by its thumbnail. The class follows (students
// who are browsing on their own stay where they are). A jumped-to slide opens in "presenting".
export function SlideNav({ session, onChange }: { session: Session; onChange: (s: Session) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (session.phase === "ended") return null;
  const total = session.slides.length;

  async function goTo(n: number) {
    if (busy || n < 1 || n > total || n === session.currentSlide) return;
    setBusy(true);
    setError("");
    try {
      await updateLive(session.id, n, "presenting");
      onChange({ ...session, currentSlide: n, phase: "presenting" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change the slide. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <nav aria-label="Slides" className="mt-3 rounded-2xl bg-white p-2">
      <div className="flex items-center gap-2">
        <button className="shrink-0 rounded-lg bg-gray-100 px-3 py-2" disabled={busy || session.currentSlide <= 1}
          onClick={() => goTo(session.currentSlide - 1)}>‹ Prev</button>
        <ol className="flex flex-1 gap-2 overflow-x-auto py-1">
          {session.slides.map(s => {
            const current = s.number === session.currentSlide;
            return (
              <li key={s.number} className="shrink-0">
                <button
                  className={`relative block w-24 overflow-hidden rounded-md border-2 ${current ? "border-emerald-700" : "border-transparent hover:border-gray-300"}`}
                  disabled={busy} aria-current={current ? "page" : undefined} aria-label={`Go to slide ${s.number}`}
                  onClick={() => goTo(s.number)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt="" className="block h-auto w-full" draggable={false} />
                  <span className={`absolute bottom-0.5 left-0.5 rounded px-1 text-xs font-bold ${current ? "bg-emerald-700 text-white" : "bg-white/90"}`}>{s.number}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button className="shrink-0 rounded-lg bg-gray-100 px-3 py-2" disabled={busy || session.currentSlide >= total}
          onClick={() => goTo(session.currentSlide + 1)}>Next ›</button>
      </div>
      {error && <p role="alert" className="px-2 pt-1 text-sm text-red-700">{error}</p>}
    </nav>
  );
}
