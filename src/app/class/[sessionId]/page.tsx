"use client";
// Student live screen (PLAN.md steps B2 to B5). Owner: Person B.
// While `following`, the phone shows the professor's live slide. Back/Forward stop following;
// "Back to Live" (or browsing onto the live slide) starts following again.
// Painting only works after tapping "Point to the exact part" (paint mode), so a stray thumb can't mark anything.
// In paint mode the slide is held still, so the mark can't land on the wrong slide.
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { explainSignal, getMySignals, getSession, subscribeToSession, type Session, type Signal } from "@/lib/api";
import type { Rect } from "@/lib/domain";
import { RectBox, SlideView } from "@/components/SlideView";
import { ExplainPanel, type Explain } from "@/features/student/ExplainPanel";
import { FloatingActions, type Toast } from "@/features/student/FloatingActions";
import { LostButton } from "@/features/student/LostButton";
import { BRUSHES, PaintLayer, type Brush, type Stroke } from "@/features/student/PaintLayer";
import { RegionPanel } from "@/features/student/RegionPanel";
import { rememberClass } from "@/features/student/lastClass";
import { HomeLogo } from "@/features/professor/HomeLogo"; // shared with the professor screens so the logo matches

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [following, setFollowing] = useState(true);
  const [viewing, setViewing] = useState(1); // only used while not following
  const [mine, setMine] = useState<Signal[]>([]); // this student's own feedback
  const [paintSlide, setPaintSlide] = useState<number | null>(null); // set while in paint mode: the slide being marked
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brush, setBrush] = useState<Brush>("M");
  const [box, setBox] = useState<Rect | null>(null);
  const [msg, setMsg] = useState<(Toast & { slide: number }) | null>(null); // last save message, for the slide it was made on
  const [wide, setWide] = useState(false); // laptop-sized screen: the controls go in a right-hand column
  const [dock, setDock] = useState<HTMLDivElement | null>(null); // spot at the bottom of the page on phones
  const [docked, setDocked] = useState(false); // phone scrolled to the bottom: buttons sit in the page instead of floating

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!dock) return;
    const observer = new IntersectionObserver(([entry]) => setDocked(entry.isIntersecting), { threshold: 0.6 });
    observer.observe(dock);
    return () => observer.disconnect();
  }, [dock]);
  const [explain, setExplain] = useState<Explain | null>(null);

  useEffect(() => {
    getSession(sessionId)
      .then(s => { setSession(s); if (s) rememberClass(s); }) // so /join brings the student back here
      .catch(() => setSession(null));
    getMySignals(sessionId).then(setMine).catch(() => {});
    const unsubscribe = subscribeToSession(sessionId, setSession);
    return unsubscribe;
  }, [sessionId]);

  if (session === undefined) return <p className="p-8 text-center text-gray-500">Loading class...</p>;
  if (session === null)
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <HomeLogo />
        <h1 className="mt-6 text-2xl font-bold">Class not found</h1>
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

  // Ask the AI about an already-saved mark. Ignores the answer if the student closed or replaced the panel.
  function runExplain(signalId: string, slideNumber: number) {
    setExplain({ signalId, slideNumber, status: "thinking", text: "" });
    explainSignal(signalId)
      .then(text => {
        setExplain(e => (e?.signalId === signalId ? { ...e, status: "done", text } : e));
        setMine(m => m.map(s => (s.id === signalId ? { ...s, explanation: text } : s)));
      })
      .catch(() => setExplain(e => (e?.signalId === signalId ? { ...e, status: "error" } : e)));
  }

  // Tapping one of the student's own boxes: show its saved explanation, or offer to ask the AI (nothing is sent yet).
  function openBox(s: Signal) {
    setExplain({ signalId: s.id, slideNumber: s.slideNumber, status: s.explanation ? "done" : "ask", text: s.explanation ?? "" });
  }

  const lostButton = (className?: string) => (
    <LostButton
      key={shown}
      sessionId={session.id}
      slideNumber={shown}
      done={mine.some(s => s.kind === "lost" && s.slideNumber === shown)}
      onSaved={saved}
      onStatus={(text, error) => setMsg({ id: Date.now(), slide: shown, text, error })}
      className={className}
    />
  );
  // One button first: I'm Lost marks the whole slide. Only after that, the student can highlight the exact part.
  const lostOnThisSlide = mine.some(s => s.kind === "lost" && s.slideNumber === shown);
  const pointButton = (className: string, label: ReactNode) => lostOnThisSlide && (
    <button onClick={() => setPaintSlide(shown)} title="Highlight the exact part you don't understand" className={className}>{label}</button>
  );
  // The last save message for this slide ("Saved ✓", errors); nothing otherwise.
  const message = msg?.slide === shown && (
    <p role="status" className={`text-center text-sm ${msg.error ? "text-red-700" : "text-gray-600"}`}>{msg.text}</p>
  );
  const switchClass = (
    <p className="text-center text-sm">
      <Link href="/join?switch=1" className="text-gray-500 underline">Join a different class</Link>
    </p>
  );
  // What to show while painting (reasons) or after Explain Now. Phones show it in a bottom sheet, laptops in the side column.
  const sheet = (
    <>
      {explain && <ExplainPanel explain={explain} onExplain={() => runExplain(explain.signalId, explain.slideNumber)} onClose={() => setExplain(null)} />}
      {painting && (
        <>
          <div className="space-y-2 rounded-xl bg-amber-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <span>{box ? "Now pick why it's confusing." : "✍️ Paint over the part you don't understand."}</span>
              <button onClick={leavePaintMode} className="shrink-0 rounded-lg bg-white px-3 py-2 font-bold">Cancel</button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Brush</span>
              {(Object.keys(BRUSHES) as Brush[]).map(size => (
                <button
                  key={size}
                  onClick={() => setBrush(size)}
                  aria-label={`${{ S: "Thin", M: "Medium", L: "Thick" }[size]} brush`}
                  aria-pressed={brush === size}
                  className={`grid h-9 w-9 place-items-center rounded-lg border-2 ${brush === size ? "border-emerald-900 bg-white" : "border-transparent bg-amber-50"}`}
                >
                  <span className="rounded-full bg-yellow-400" style={{ width: BRUSHES[size], height: BRUSHES[size] }} />
                </button>
              ))}
              {!wide && <span className="ml-1 text-gray-600">Pinch with 2 fingers to zoom</span>}
            </div>
          </div>
          {box && (
            <RegionPanel
              key={paintSlide}
              sessionId={session.id}
              slideNumber={shown}
              rect={box}
              onSaved={(signal, wantsExplanation) => {
                saved(signal);
                leavePaintMode();
                if (wantsExplanation) runExplain(signal.id, signal.slideNumber);
                else setMsg({ id: Date.now(), slide: signal.slideNumber, text: "Saved for later ✓ It's in My Review after class.", error: false });
              }}
              onClear={erasePaint}
            />
          )}
        </>
      )}
    </>
  );
  const idle = !ended && !painting && !explain;

  return (
    <main className="mx-auto max-w-3xl p-3 pb-8 md:max-w-6xl md:p-6">
      <header className="mb-3 flex items-center gap-3">
        <HomeLogo />
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{session.title}</h1>
        <span className="shrink-0 text-sm text-gray-600">Slide {shown} / {total}</span>
      </header>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-6">
        <section>
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
            {myBoxes.map(s => (
              <RectBox
                key={s.id}
                rect={s.rect!}
                // clickable on any slide and in any phase, but not while painting (then taps must reach the paint layer)
                onClick={painting ? undefined : () => openBox(s)}
                title={s.explanation ? "See the AI explanation" : "Ask the AI to explain this"}
                className={`rounded-sm border-orange-500 ${explain?.signalId === s.id
                  ? "border-[3px] bg-orange-500/35 ring-4 ring-orange-300"
                  : "border-2 bg-orange-500/15"}`}
              >
                {s.explanation && <span aria-hidden className="absolute -top-2.5 -right-2.5 text-base leading-none">💡</span>}
              </RectBox>
            ))}
            {painting && <PaintLayer strokes={strokes} brush={brush} onChange={(next, nextBox) => { setStrokes(next); setBox(nextBox); }} />}
            {box && <RectBox rect={box} className="rounded-sm border-[3px] border-dashed border-orange-600" />}
          </SlideView>
          {myBoxes.length > 0 && !painting && (
            <p className="mt-2 text-center text-sm text-gray-500">Tap your orange boxes to see the AI explanation again.</p>
          )}

          <nav className="mt-3 grid grid-cols-2 gap-3">
            <button onClick={() => browse(shown - 1)} disabled={shown === 1 || painting} className="rounded-xl bg-white p-4 text-lg font-bold shadow-sm">← Back</button>
            <button onClick={() => browse(shown + 1)} disabled={shown === total || painting} className="rounded-xl bg-white p-4 text-lg font-bold shadow-sm">Forward →</button>
          </nav>

          {following && !painting && !ended && <p className="mt-3 text-center text-sm text-gray-500">Following the professor live</p>}
          {!wide && !painting && <div className="mt-2">{switchClass}</div>}

          {/* Phones: the bottom of the page. Once it scrolls into view, the floating buttons settle here. */}
          {!wide && !ended && (
            <div ref={setDock} className="mt-4 min-h-28 space-y-2">
              {idle && docked && (
                <>
                  {lostButton("w-full rounded-xl p-3 text-xl")}
                  {message}
                  {pointButton("w-full rounded-xl border-2 border-emerald-900 bg-white p-3 font-bold text-emerald-900", "✍️ Highlight the exact part")}
                </>
              )}
            </div>
          )}
        </section>

        {/* Laptops and tablets: a side column, like the professor screen. */}
        {wide && (
          <aside className="sticky top-6 space-y-3">
            {idle && (
              <div className="space-y-3 rounded-2xl bg-white p-5">
                <h2 className="font-bold">Lost on this slide?</h2>
                {lostButton("w-full rounded-xl p-4 text-xl")}
                {message}
                {lostOnThisSlide && <p className="text-center text-sm text-gray-600">Want to be more specific?</p>}
                {pointButton("w-full rounded-xl border-2 border-emerald-900 bg-white p-4 text-lg font-bold text-emerald-900", "✍️ Highlight the exact part")}
                {switchClass}
              </div>
            )}
            {sheet}
          </aside>
        )}
      </div>

      {/* Phones, mid-page: small round buttons the student can drag out of the way. */}
      {!wide && idle && !docked && (
        <FloatingActions toast={msg}>
          {lostButton("grid h-20 w-20 place-items-center rounded-full p-2 text-base leading-tight shadow-lg")}
          {pointButton(
            "grid h-16 w-16 place-items-center rounded-full border-2 border-emerald-900 bg-white text-sm font-bold leading-tight text-emerald-900 shadow-lg",
            <span><span className="text-xl">✍️</span><br /><span className="text-xs">Highlight</span></span>,
          )}
        </FloatingActions>
      )}

      {/* Phones: a bottom sheet, only while it's needed (picking reasons, or reading an explanation). */}
      {!wide && (painting || explain) && (
        <div className="sticky bottom-0 z-10 -mx-3 mt-4 space-y-3 border-t border-gray-200 bg-[#f3f5f2]/95 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
          {sheet}
        </div>
      )}
    </main>
  );
}
