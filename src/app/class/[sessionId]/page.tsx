"use client";
// Student live screen (PLAN.md steps B2 to B4). Owner: Person B.
// While `following`, the phone shows the professor's live slide. Back/Forward stop following;
// "Back to Live" (or browsing onto the live slide) starts following again.
// Painting only works after tapping "Mark the confusing part" (paint mode), so a stray thumb can't mark anything.
// In paint mode the slide is held still, so the mark can't land on the wrong slide.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getMySignals, getSession, subscribeToSession, type Session, type Signal } from "@/lib/api";
import type { Rect } from "@/lib/domain";
import { RectBox, SlideView } from "@/components/SlideView";
import { LostButton } from "@/features/student/LostButton";
import { PaintLayer, type Point } from "@/features/student/PaintLayer";
import { RegionPanel } from "@/features/student/RegionPanel";

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [following, setFollowing] = useState(true);
  const [viewing, setViewing] = useState(1); // only used while not following
  const [mine, setMine] = useState<Signal[]>([]); // this student's own feedback
  const [paintSlide, setPaintSlide] = useState<number | null>(null); // set while in paint mode: the slide being marked
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [box, setBox] = useState<Rect | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    getSession(sessionId).then(setSession).catch(() => setSession(null));
    getMySignals(sessionId).then(setMine).catch(() => {});
    const unsubscribe = subscribeToSession(sessionId, setSession);
    return unsubscribe;
  }, [sessionId]);

  if (session === undefined) return <p className="p-8 text-center text-gray-500">Loading class...</p>;
  if (session === null)
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Class not found</h1>
        <Link href="/join" className="mt-6 inline-block rounded-xl bg-emerald-900 px-6 py-3 text-white">Join another class</Link>
      </main>
    );

  const total = session.slides.length;
  const live = session.currentSlide;
  const ended = session.phase === "ended";
  const painting = paintSlide !== null;
  const shown = paintSlide ?? (following ? live : viewing);
  const slide = session.slides[shown - 1];
  const myBoxes = mine.filter(s => s.kind === "region" && s.slideNumber === shown && s.rect);

  function browse(to: number) {
    const next = Math.max(1, Math.min(total, to));
    setFollowing(next === live); // landing on the live slide means following again
    setViewing(next);
    setNote("");
  }

  function erasePaint() {
    setStrokes([]);
    setBox(null);
  }

  function leavePaintMode() {
    erasePaint();
    setPaintSlide(null);
  }

  function saved(signal: Signal) {
    setMine(m => [...m.filter(s => s.id !== signal.id), signal]);
  }

  return (
    <main className="mx-auto max-w-3xl p-3 pb-8 md:p-6">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="truncate text-lg font-bold">{session.title}</h1>
        <span className="shrink-0 text-sm text-gray-600">Slide {shown} / {total}</span>
      </header>

      {ended ? (
        <div className="mb-3 rounded-xl bg-emerald-900 p-4 text-white">
          <p className="font-bold">Class ended</p>
          <Link href={`/class/${session.id}/review`} className="mt-3 block rounded-lg bg-white p-3 text-center font-bold text-emerald-900">
            Open My Review →
          </Link>
        </div>
      ) : painting ? (
        live !== shown && <p className="mb-3 rounded-xl bg-amber-100 p-3">Class moved to slide {live}. Save or cancel your mark to catch up.</p>
      ) : !following ? (
        <button onClick={() => setFollowing(true)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-amber-100 p-3 text-left">
          <span>Class is on slide {live}.</span>
          <b className="rounded-lg bg-emerald-900 px-3 py-1 text-white">Back to Live</b>
        </button>
      ) : session.phase === "reviewing" ? (
        <p className="mb-3 rounded-xl bg-sky-100 p-3 text-sm">Professor is reviewing feedback</p>
      ) : null}

      <SlideView imageUrl={slide.imageUrl} alt={`Slide ${shown}`} className={painting ? "ring-4 ring-amber-400" : ""}>
        {myBoxes.map(s => <RectBox key={s.id} rect={s.rect!} className="rounded-sm border-2 border-orange-500 bg-orange-500/15" />)}
        {painting && <PaintLayer strokes={strokes} onChange={(next, nextBox) => { setStrokes(next); setBox(nextBox); }} />}
        {box && <RectBox rect={box} className="rounded-sm border-[3px] border-dashed border-orange-600" />}
      </SlideView>

      <nav className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => browse(shown - 1)} disabled={shown === 1 || painting} className="rounded-xl bg-white p-4 text-lg font-bold shadow-sm">← Back</button>
        <button onClick={() => browse(shown + 1)} disabled={shown === total || painting} className="rounded-xl bg-white p-4 text-lg font-bold shadow-sm">Forward →</button>
      </nav>

      {!ended && (
        <div className="mt-4 space-y-3">
          {painting ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-100 p-3">
                <span>{box ? "Now pick why it's confusing." : "✍️ Paint over the part you don't understand."}</span>
                <button onClick={leavePaintMode} className="shrink-0 rounded-lg bg-white px-3 py-2 font-bold">Cancel</button>
              </div>
              {box && (
                <RegionPanel
                  key={paintSlide}
                  sessionId={session.id}
                  slideNumber={shown}
                  rect={box}
                  onSaved={signal => { saved(signal); leavePaintMode(); setNote("Saved for later ✓ It's in My Review after class."); }}
                  onClear={erasePaint}
                />
              )}
            </>
          ) : (
            <>
              {note && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-center text-emerald-900">{note}</p>}
              <LostButton
                key={shown}
                sessionId={session.id}
                slideNumber={shown}
                done={mine.some(s => s.kind === "lost" && s.slideNumber === shown)}
                onSaved={saved}
              />
              <button
                onClick={() => { setPaintSlide(shown); setNote(""); }}
                className="w-full rounded-xl border-2 border-emerald-900 bg-white p-4 text-xl font-bold text-emerald-900"
              >
                ✍️ Mark the confusing part
              </button>
            </>
          )}
        </div>
      )}
      {following && !painting && !ended && <p className="mt-3 text-center text-sm text-gray-500">Following the professor live</p>}
    </main>
  );
}
