"use client";
// Student live screen (docs/build-plan.md steps B2 to B5). Owner: Person B.
// While `following`, the phone shows the instructor's live slide. Prev/Next or a thumbnail stop following;
// "Back to Live" (or browsing onto the live slide) starts following again.
// Painting only works after tapping "Point to the exact part" (paint mode), so a stray thumb can't mark anything.
// In paint mode the slide is held still, so the mark can't land on the wrong slide.
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { explainSignal, getMySignals, getSession, subscribeToSession, type Session, type Signal } from "@/lib/api";
import type { Rect } from "@/lib/domain";
import { RectBox, SlideView } from "@/components/SlideView";
import { BoxEditor } from "@/features/student/BoxEditor";
import { ClassSummary } from "@/features/student/ClassSummary";
import { ExplainPanel, type Explain } from "@/features/student/ExplainPanel";
import { ExplainRail } from "@/features/student/ExplainRail";
import { InstructorInk } from "@/features/student/InstructorInk";
import { FloatingActions, type Toast } from "@/features/student/FloatingActions";
import { LostButton } from "@/features/student/LostButton";
import { BRUSH_MAX, BRUSH_MIN, BRUSH_START, PaintLayer, paintedBoxes, type Stroke } from "@/features/student/PaintLayer";
import { RegionPanel } from "@/features/student/RegionPanel";
import { SlideStrip } from "@/features/student/SlideStrip";
import { rememberClass } from "@/features/student/lastClass";
import { CrestLogo } from "@/features/student/CrestLogo";

// The same pen drawing the instructor's toolbar uses, so both screens look alike.
function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [following, setFollowing] = useState(true);
  const [viewing, setViewing] = useState(1); // only used while not following
  const [mine, setMine] = useState<Signal[]>([]); // this student's own feedback
  const [paintSlide, setPaintSlide] = useState<number | null>(null); // set while in paint mode: the slide being marked
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brush, setBrush] = useState(BRUSH_START); // brush width in screen pixels
  const [pencilOnly, setPencilOnly] = useState(false); // an Apple Pencil was used: fingers scroll, only the pencil paints
  const slideAspect = useRef(16 / 9); // the slide's width / height, from the paint layer (for undo)
  const [boxes, setBoxes] = useState<Rect[]>([]); // one per highlighted part
  const [picking, setPicking] = useState(false); // phones: done highlighting, now picking reasons
  const [msg, setMsg] = useState<(Toast & { slide: number }) | null>(null); // last save error, for the slide it was made on (the ✓ on the button says "saved")
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
  const [summaryOpen, setSummaryOpen] = useState(true); // the end-of-class summary; closing it keeps it closed

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
        <CrestLogo />
        <h1 className="mt-6 text-2xl font-bold">Class not found</h1>
        <Link href="/join" className="mt-6 inline-block rounded-xl bg-[#0c2b4c] px-6 py-3 text-white">Join another class</Link>
      </main>
    );

  const total = session.slides.length;
  const live = session.currentSlide;
  const ended = session.phase === "ended";
  const painting = paintSlide !== null;
  const shown = paintSlide ?? (following ? live : viewing);
  const slide = session.slides[shown - 1];
  const myBoxes = mine.filter(s => s.kind === "region" && s.slideNumber === shown && s.rect);
  const explainedHere = myBoxes.filter(s => s.explanation);
  const explainedAll = mine.filter(s => s.kind === "region" && s.rect && s.explanation);

  function browse(to: number) {
    const next = Math.max(1, Math.min(total, to));
    setFollowing(next === live); // landing on the live slide means following again
    setViewing(next);
  }

  // Take back only the last stroke, not everything the student painted.
  function undoStroke() {
    const next = strokes.slice(0, -1);
    setStrokes(next);
    setBoxes(paintedBoxes(next, slideAspect.current));
  }

  function leavePaintMode() {
    setStrokes([]);
    setBoxes([]);
    setPaintSlide(null);
    setPicking(false);
  }

  function saved(signal: Signal) {
    setMine(m => [...m.filter(s => s.id !== signal.id), signal]);
  }

  function addExplanation(signalId: string, text: string) {
    setMine(m => m.map(s => (s.id === signalId ? { ...s, explanation: text } : s)));
  }

  // Ask the AI about an already-saved mark. Ignores the answer if the student closed or replaced the panel.
  function runExplain(signalId: string, slideNumber: number) {
    setExplain({ signalId, slideNumber, status: "thinking", text: "" });
    explainSignal(signalId)
      .then(text => {
        setExplain(e => (e?.signalId === signalId ? { ...e, status: "done", text } : e));
        addExplanation(signalId, text);
      })
      .catch(err => {
        const text = err instanceof Error ? err.message : ""; // the API's readable reason, e.g. "AI is busy right now..."
        setExplain(e => (e?.signalId === signalId ? { ...e, status: "error", text } : e));
      });
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
      onStatus={(text, error) => setMsg(error ? { id: Date.now(), slide: shown, text, error } : null)}
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
          {/* Same look as the instructor's draw toolbar (DrawToolbar), with student-sized buttons.
              Phones: the reasons only come after "Done highlighting", so they don't cover the slide while painting. */}
          {picking ? (
            <button onClick={() => setPicking(false)} className="text-sm font-bold text-[#0c2b4c]">‹ Keep highlighting</button>
          ) : (
            <div className="select-none space-y-1 rounded-xl bg-white p-1.5 text-sm shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 rounded-lg border border-[#c9d6e6] bg-[#eef3f9] px-3 py-2 font-bold text-[#0c2b4c]"><PenIcon /> Highlighting</span>
                <div className="flex items-center">
                  <button onClick={undoStroke} disabled={!strokes.length} className="rounded-lg px-2.5 py-2 hover:bg-gray-100 disabled:text-gray-400">Undo</button>
                  <span className="mx-1 h-6 w-px bg-gray-200" />
                  <button onClick={leavePaintMode} className="rounded-lg px-2.5 py-2 text-red-800 hover:bg-red-50">Cancel</button>
                </div>
              </div>
              <div className="flex items-center gap-1 px-1">
                <span className="mr-1 text-gray-600">Brush</span>
                <input type="range" min={BRUSH_MIN} max={BRUSH_MAX} value={brush} aria-label="Brush size"
                  onChange={e => setBrush(Number(e.target.value))}
                  className="min-w-0 flex-1 accent-gray-900" />
                <span className="grid h-9 w-9 shrink-0 place-items-center" aria-hidden>
                  <span className="rounded-full bg-yellow-400" style={{ width: brush, height: brush }} />
                </span>
              </div>
            </div>
          )}
          {!wide && !picking && boxes.length > 0 && (
            <button onClick={() => setPicking(true)} className="w-full rounded-xl bg-[#0c2b4c] p-3 font-bold text-white">
              Done highlighting →
            </button>
          )}
          {boxes.length > 0 && (wide || picking) && (
            <RegionPanel
              key={paintSlide}
              sessionId={session.id}
              slideNumber={shown}
              rects={boxes}
              onSaved={(signals, wantsExplanation) => {
                signals.forEach(saved);
                leavePaintMode();
                setMsg(null);
                if (!wantsExplanation) return;
                // The panel shows the first part's explanation; the others arrive as 💡 next to their boxes.
                runExplain(signals[0].id, signals[0].slideNumber);
                signals.slice(1).forEach(s => explainSignal(s.id).then(text => addExplanation(s.id, text)).catch(() => {}));
              }}
            />
          )}
        </>
      )}
    </>
  );
  const idle = !ended && !painting && !explain;

  return (
    <main className="mx-auto max-w-3xl p-3 pb-8 text-[#0c2b4c] md:max-w-6xl md:p-6">
      <header className="mb-3 flex items-center gap-3">
        <CrestLogo />
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{session.title}</h1>
        <span className="shrink-0 text-sm text-gray-600">Slide {shown} / {total}</span>
      </header>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-6">
        <section>
          {ended ? (
            <div className="mb-3 rounded-xl bg-[#0c2b4c] p-4 text-white">
              <p className="font-bold">Class ended</p>
              <Link href={`/class/${session.id}/review`} className="mt-3 block rounded-lg bg-white p-3 text-center font-bold text-[#0c2b4c]">
                Open My Review →
              </Link>
              {explainedAll.length > 0 && (
                <button onClick={() => setSummaryOpen(true)} className="mt-2 w-full rounded-lg border border-white/40 p-2 text-sm font-bold">
                  💡 Today&apos;s AI explanations ({explainedAll.length})
                </button>
              )}
            </div>
          ) : painting ? (
            live !== shown && <p className="mb-3 rounded-xl bg-amber-100 p-3">Class moved to slide {live}. Save or cancel your mark to catch up.</p>
          ) : !following ? (
            <button onClick={() => setFollowing(true)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-amber-100 p-3 text-left">
              <span>Class is on slide {live}.</span>
              <b className="rounded-lg bg-[#0c2b4c] px-3 py-1 text-white">Back to Live</b>
            </button>
          ) : session.phase === "reviewing" ? (
            <p className="mb-3 rounded-xl bg-[#eef3f9] p-3 text-sm">Instructor is reviewing feedback</p>
          ) : null}

          <div className="flex gap-1.5">
            <SlideView imageUrl={slide.imageUrl} alt={`Slide ${shown}`} className={`min-w-0 flex-1 ${painting ? "ring-4 ring-amber-400" : ""}`}>
              <InstructorInk sessionId={session.id} slideNumber={shown} /> {/* first = underneath the student's marks */}
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
                />
              ))}
              {painting && (
                <PaintLayer
                  strokes={strokes}
                  brush={brush}
                  pencilOnly={pencilOnly}
                  onPencil={() => setPencilOnly(true)}
                  onChange={(next, nextBoxes, aspect) => { setStrokes(next); setBoxes(nextBoxes); slideAspect.current = aspect; }}
                />
              )}
              {painting && ( // the handle on each box scales that part's ink
                <BoxEditor strokes={strokes} aspect={slideAspect.current}
                  onChange={next => { setStrokes(next); setBoxes(paintedBoxes(next, slideAspect.current)); }} />
              )}
            </SlideView>
            {/* 💡 in the margin, level with each explained box (stays while painting so the slide doesn't change size) */}
            {explainedHere.length > 0 && <ExplainRail marks={explainedHere} activeId={explain?.signalId} disabled={painting} onOpen={openBox} />}
          </div>
          {myBoxes.length > 0 && !painting && (
            <p className="mt-2 text-center text-sm text-gray-500">
              {explainedHere.length ? "Tap 💡 or an orange box to see the AI explanation again." : "Tap an orange box to ask the AI about it."}
            </p>
          )}

          <SlideStrip
            slides={session.slides}
            shown={shown}
            live={ended ? null : live}
            marked={new Set(mine.map(s => s.slideNumber))}
            disabled={painting}
            onGo={browse}
          />

          {following && !painting && !ended && <p className="mt-3 text-center text-sm text-gray-500">Following the instructor live</p>}
          {!wide && !painting && <div className="mt-2">{switchClass}</div>}

          {/* Phones: the bottom of the page. Once it scrolls into view, the floating buttons settle here. */}
          {!wide && !ended && (
            <div ref={setDock} className="mt-4 min-h-28 space-y-2">
              {idle && docked && (
                <>
                  {lostButton("w-full rounded-xl p-3 text-xl")}
                  {message}
                  {pointButton("w-full rounded-xl border-2 border-[#0c2b4c] bg-white p-3 font-bold text-[#0c2b4c]", "✍️ Highlight the exact part")}
                </>
              )}
            </div>
          )}
        </section>

        {/* Laptops and tablets: a side column, like the instructor screen. */}
        {wide && (
          <aside className="sticky top-6 space-y-3">
            {idle && (
              <div className="space-y-3 rounded-2xl bg-white p-5">
                <h2 className="font-bold">Lost on this slide?</h2>
                {lostButton("w-full rounded-xl p-4 text-xl")}
                {message}
                {lostOnThisSlide && <p className="text-center text-sm text-gray-600">Want to be more specific?</p>}
                {pointButton("w-full rounded-xl border-2 border-[#0c2b4c] bg-white p-4 text-lg font-bold text-[#0c2b4c]", "✍️ Highlight the exact part")}
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
            "grid h-16 w-16 place-items-center rounded-full border-2 border-[#0c2b4c] bg-white text-sm font-bold leading-tight text-[#0c2b4c] shadow-lg",
            <span><span className="text-xl">✍️</span><br /><span className="text-xs">Highlight</span></span>,
          )}
        </FloatingActions>
      )}

      {/* When the class ends: every AI explanation from today, until the student closes it */}
      {ended && summaryOpen && explainedAll.length > 0 && (
        <ClassSummary explained={explainedAll} reviewHref={`/class/${session.id}/review`} onClose={() => setSummaryOpen(false)} />
      )}

      {/* Phones: a bottom sheet, only while it's needed (picking reasons, or reading an explanation). */}
      {!wide && (painting || explain) && (
        <div className="sticky bottom-0 z-10 -mx-3 mt-4 space-y-3 border-t border-[#e8e5df] bg-[#faf9f7]/95 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
          {sheet}
        </div>
      )}
    </main>
  );
}
