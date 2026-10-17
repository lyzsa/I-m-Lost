"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSession, subscribeToSession, type Session } from "@/lib/api";
import { SlideView, toSlideFraction } from "@/components/SlideView";
import { DenseAreaLayer } from "@/features/professor/DenseAreaLayer";
import { EyeIcon } from "@/features/professor/EyeIcon";
import { findDenseAreas } from "@/features/professor/denseAreas";
import { HeatmapLayer } from "@/features/professor/HeatmapLayer";
import { HomeLogo } from "@/features/professor/HomeLogo";
import { JoinCard } from "@/features/professor/JoinCard";
import { LiveControls } from "@/features/professor/LiveControls";
import { rememberClass } from "@/features/professor/myClasses";
import { SlideNav } from "@/features/professor/SlideNav";
import { SpotPopup } from "@/features/professor/SpotPopup";
import { StatsPanel, type Spot } from "@/features/professor/StatsPanel";
import { useSlideSignals } from "@/features/professor/useSlideSignals";
import { ZoomStage } from "@/features/professor/ZoomStage";

export default function HostLivePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(); // undefined = loading, null = not found
  // Heatmap toggle. Default: clean while presenting (students see the projector), heatmap otherwise.
  // A manual choice only lasts for the current slide + phase.
  const [heatChoice, setHeatChoice] = useState<{ key: string; show: boolean }>();
  const signals = useSlideSignals(sessionId, session?.currentSlide ?? 1);
  // The spot the professor clicked on the heatmap; like the toggle, it only lasts for the current slide + phase.
  const [spotChoice, setSpotChoice] = useState<{ key: string; spot: Spot }>();
  const [hover, setHover] = useState<Spot>(); // where the mouse is over the slide (no hover on touch screens)
  const [threshold, setThreshold] = useState(2); // a "dense area" needs at least this many different students
  const areas = useMemo(() => findDenseAreas(signals, threshold), [signals, threshold]);

  useEffect(() => {
    let active = true;
    getSession(sessionId).then(s => {
      if (!active) return;
      setSession(s);
      if (s) rememberClass(s); // so this professor can resume it later from /host
    }).catch(() => { if (active) setSession(null); });
    const unsubscribe = subscribeToSession(sessionId, s => { if (active) setSession(s); });
    return () => { active = false; unsubscribe(); };
  }, [sessionId]);

  if (session === undefined) return <main className="p-8 text-gray-600">Loading class...</main>;
  if (session === null)
    return (
      <main className="mx-auto max-w-xl p-8 pt-16">
        <HomeLogo />
        <h1 className="mt-6 text-3xl font-bold">Class not found</h1>
        <Link href="/host" className="mt-6 inline-block rounded-xl bg-emerald-900 px-6 py-3 text-white">Start a new class</Link>
      </main>
    );

  const slide = session.slides.find(s => s.number === session.currentSlide) ?? session.slides[0];
  const heatKey = `${session.currentSlide}:${session.phase}`;
  const showHeat = heatChoice?.key === heatKey ? heatChoice.show : session.phase !== "presenting";
  const boxCount = signals.filter(s => s.kind === "region").length;
  const spot = showHeat && spotChoice?.key === heatKey ? spotChoice.spot : undefined;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <HomeLogo />
          <h1 className="text-2xl font-bold">{session.title}</h1>
        </div>
        <span className="text-sm text-gray-600">Professor view</span>
      </header>
      {/* minmax(0,1fr): never let a large slide image push the side panel off screen */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ZoomStage imageUrl={slide.imageUrl}>
            <SlideView
              imageUrl={slide.imageUrl}
              alt={`Slide ${slide.number}`}
              className={showHeat ? "cursor-crosshair" : ""}
              onClick={e => { if (showHeat) setSpotChoice({ key: heatKey, spot: toSlideFraction(e, e.currentTarget) }); }}
              onPointerMove={e => { if (showHeat && e.pointerType === "mouse") setHover(toSlideFraction(e, e.currentTarget)); }}
              onPointerLeave={() => setHover(undefined)}
            >
              {showHeat && <HeatmapLayer signals={signals} />}
              {showHeat && <DenseAreaLayer areas={areas} />}
              {showHeat && hover && <SpotPopup signals={signals} spot={hover} />}
              {spot && (
                <div
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-700 shadow"
                  style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
                />
              )}
            </SlideView>
          </ZoomStage>
          <SlideNav session={session} onChange={setSession} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2" onClick={() => setHeatChoice({ key: heatKey, show: !showHeat })}>
              <EyeIcon off={showHeat} />
              {showHeat ? "Hide heatmap (clean view)" : "Show heatmap"}
            </button>
            {showHeat && (
              <span className="text-sm text-gray-600">
                {boxCount ? `${boxCount} ${boxCount === 1 ? "box" : "boxes"} on this slide · darker = more overlap` : "No boxes on this slide yet"}
              </span>
            )}
            {showHeat && boxCount > 0 && (
              <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm">
                Dense areas: at least
                <button aria-label="Lower threshold" className="h-7 w-7 rounded-lg bg-gray-100" disabled={threshold <= 1} onClick={() => setThreshold(t => t - 1)}>−</button>
                <b className="w-4 text-center">{threshold}</b>
                <button aria-label="Raise threshold" className="h-7 w-7 rounded-lg bg-gray-100" disabled={threshold >= 9} onClick={() => setThreshold(t => t + 1)}>+</button>
                {threshold === 1 ? "student" : "students"} on the same spot
                <span className="text-gray-500">· {areas.length ? `${areas.length} found` : "none yet"}</span>
              </span>
            )}
          </div>
        </div>
        <aside className="space-y-4">
          <JoinCard sessionId={session.id} code={session.code} />
          <LiveControls session={session} onChange={setSession} />
          {showHeat ? (
            <StatsPanel signals={signals} spot={spot} onClearSpot={() => setSpotChoice(undefined)} />
          ) : (
            <p className="px-2 text-sm text-gray-500">Feedback is hidden in clean view. Use &quot;Show heatmap&quot; to see it.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
