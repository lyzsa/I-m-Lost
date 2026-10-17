"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSession, subscribeToSession, type Session } from "@/lib/api";
import { SlideView, toSlideFraction } from "@/components/SlideView";
import { AnnotationLayer } from "@/features/annotations/AnnotationLayer";
import { DenseAreaLayer, areaAt, areaKey } from "@/features/professor/DenseAreaLayer";
import { DrawLayer } from "@/features/professor/DrawLayer";
import { DrawToolbar, PEN_COLORS, PEN_WIDTHS } from "@/features/professor/DrawToolbar";
import { EyeIcon } from "@/features/professor/EyeIcon";
import { findDenseAreas } from "@/features/professor/denseAreas";
import { HeatmapLayer } from "@/features/professor/HeatmapLayer";
import { HomeLogo } from "@/features/professor/HomeLogo";
import { JoinCard } from "@/features/professor/JoinCard";
import { LiveControls } from "@/features/professor/LiveControls";
import { OtherResponsesModal, type ResponsesView } from "@/features/professor/OtherResponses";
import { rememberClass } from "@/features/professor/myClasses";
import { SlideNav } from "@/features/professor/SlideNav";
import { StatsPanel } from "@/features/professor/StatsPanel";
import { useInstructorPen } from "@/features/professor/useInstructorPen";
import { useSlideSignals } from "@/features/professor/useSlideSignals";
import { ZoomStage } from "@/features/professor/ZoomStage";

export default function HostLivePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(); // undefined = loading, null = not found
  // Heatmap toggle. Default: clean while presenting (students see the projector), heatmap otherwise.
  // A manual choice only lasts for the current slide + phase.
  const [heatChoice, setHeatChoice] = useState<{ key: string; show: boolean }>();
  const signals = useSlideSignals(sessionId, session?.currentSlide ?? 1);
  // Confusion-spot windows: the spot under the mouse shows its window; clicked spots stay open (current slide + phase only).
  const [hoverSpot, setHoverSpot] = useState<string>();
  const [pinnedSpots, setPinnedSpots] = useState<{ key: string; ids: string[] }>();
  const [threshold, setThreshold] = useState(2); // a "dense area" needs at least this many different students
  const [responses, setResponses] = useState<ResponsesView>(); // the large "Other" responses window, when open
  const areas = useMemo(() => findDenseAreas(signals, threshold), [signals, threshold]);
  // Draw mode: the instructor's pen strokes are saved and appear on every student's slide.
  const [drawMode, setDrawMode] = useState(false);
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].value);
  const [penWidth, setPenWidth] = useState<number>(PEN_WIDTHS[0].value);
  const pen = useInstructorPen(sessionId, session?.currentSlide ?? 1);
  const drawing = drawMode && !!session && session.phase !== "ended";

  // Ctrl/Cmd+Z undoes the last stroke while drawing.
  const undoStroke = pen.undo;
  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); undoStroke(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, undoStroke]);

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
  const pinned = showHeat && pinnedSpots?.key === heatKey ? pinnedSpots.ids : [];
  const setPinned = (ids: string[]) => setPinnedSpots({ key: heatKey, ids });

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <HomeLogo />
          <h1 className="text-2xl font-bold">{session.title}</h1>
        </div>
        <span className="text-sm text-gray-600">Instructor&apos;s view</span>
      </header>
      {/* minmax(0,1fr): never let a large slide image push the side panel off screen */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ZoomStage imageUrl={slide.imageUrl} hideControls={drawing}>
            <SlideView
              imageUrl={slide.imageUrl}
              alt={`Slide ${slide.number}`}
              className={drawing ? "ring-4 ring-amber-400" : showHeat && hoverSpot ? "cursor-pointer" : ""}
              onClick={e => {
                if (!showHeat || drawing) return;
                const p = toSlideFraction(e, e.currentTarget);
                const hit = areaAt(areas, p.x, p.y);
                if (!hit) return setPinned([]);                       // empty part of the slide: close pinned windows
                const k = areaKey(hit);
                setPinned(pinned.includes(k) ? pinned.filter(x => x !== k) : [...pinned, k]); // click a spot: pin / unpin
              }}
              onPointerMove={e => {
                if (!showHeat || drawing || e.pointerType !== "mouse") return;
                const p = toSlideFraction(e, e.currentTarget);
                const hit = areaAt(areas, p.x, p.y);
                setHoverSpot(hit ? areaKey(hit) : undefined);
              }}
              onPointerLeave={() => setHoverSpot(undefined)}
            >
              {showHeat && <HeatmapLayer signals={signals} />}
              <AnnotationLayer annotations={pen.strokes} />
              {showHeat && (
                <DenseAreaLayer areas={areas} hovered={drawing ? undefined : hoverSpot} pinned={pinned}
                  onUnpin={k => setPinned(pinned.filter(x => x !== k))}
                  onOpenResponses={(n, answers) => setResponses({ title: `Slide ${slide.number} · dense area ${n}`, answers })} />
              )}
              {drawing && <DrawLayer color={penColor} width={penWidth} onStroke={pts => pen.addStroke(pts, penColor, penWidth)} />}
            </SlideView>
          </ZoomStage>
          <SlideNav session={session} onChange={setSession} />
          {session.phase !== "ended" && (
            <div className="mt-3">
              <DrawToolbar drawing={drawing} onToggle={() => { setDrawMode(d => !d); setHoverSpot(undefined); }}
                color={penColor} onColor={setPenColor} width={penWidth} onWidth={setPenWidth}
                canUndo={pen.canUndo} onUndo={pen.undo} hasStrokes={pen.hasStrokes} onClear={pen.clearSlide} />
              {pen.error && <p role="alert" className="mt-1 text-sm text-red-700">{pen.error}</p>}
            </div>
          )}
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
            <StatsPanel signals={signals}
              onOpenOther={(where, answers) => setResponses({ title: `Slide ${slide.number} · ${where}`, answers })} />
          ) : (
            <p className="px-2 text-sm text-gray-500">Feedback is hidden in clean view. Use &quot;Show heatmap&quot; to see it.</p>
          )}
        </aside>
      </div>
      {responses && <OtherResponsesModal view={responses} onClose={() => setResponses(undefined)} />}
    </main>
  );
}
