"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAnnotations, getSession, getSlideSignals, type Annotation, type Session, type Signal } from "@/lib/api";
import { SlideView } from "@/components/SlideView";
import { AnnotationLayer } from "@/features/annotations/AnnotationLayer";
import { ClusterOutlines } from "@/features/instructor/DenseAreaLayer";
import { findDenseAreas, type DenseArea } from "@/features/instructor/denseAreas";
import { HeatmapLayer } from "@/features/instructor/HeatmapLayer";
import { HomeLogo } from "@/features/instructor/HomeLogo";
import { ReasonPie } from "@/features/instructor/ReasonPie";
import { otherAnswers, slideStats } from "@/features/instructor/stats";

type Loaded = { session: Session; bySlide: Signal[][]; strokesBySlide: Annotation[][] };
const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

// Every typed "Other" response, in full, one card each.
function Responses({ answers }: { answers: string[] }) {
  return (
    <ul className="mt-2 grid gap-2 md:grid-cols-2">
      {answers.map((a, k) => (
        <li key={k} className="rounded-lg border bg-white px-3 py-2 text-sm italic">&ldquo;{a}&rdquo;</li>
      ))}
    </ul>
  );
}

function SlideSummary({ slide, signals, strokes, threshold }: {
  slide: Session["slides"][number]; signals: Signal[]; strokes: Annotation[]; threshold: number;
}) {
  const s = slideStats(signals);
  const areas: DenseArea[] = useMemo(() => findDenseAreas(signals, threshold), [signals, threshold]);
  const inAnyArea = new Set(areas.flatMap(a => a.signalIds));
  const elsewhere = otherAnswers(signals.filter(sig => !inAnyArea.has(sig.id)));

  return (
    <li className="grid gap-5 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[minmax(0,380px)_1fr]">
      <div>
        <SlideView imageUrl={slide.imageUrl} alt={`Slide ${slide.number} with students' marks`} className="rounded-lg">
          <HeatmapLayer signals={signals} />
          <AnnotationLayer annotations={strokes} />
          <ClusterOutlines areas={areas} />
        </SlideView>
      </div>

      <div className="min-w-0">
        <h2 className="text-lg font-bold">Slide {slide.number}</h2>
        {s.lost + s.boxes === 0 ? (
          <p className="mt-1 text-gray-500">No feedback on this slide.</p>
        ) : (
          <>
            <p className="mt-1">
              <b>{s.lost}</b> I&apos;m Lost · <b>{s.boxes}</b> {s.boxes === 1 ? "mark" : "marks"} · <b>{s.students}</b> {plural(s.students, "student")}
            </p>
            {s.lost > 0 && <p className="text-xs text-gray-500">I&apos;m Lost taps are for the whole slide, so they don&apos;t belong to a cluster.</p>}

            {s.boxes > 0 && (
              <section className="mt-3">
                <h3 className="text-sm font-bold">Whole slide: why students marked it</h3>
                <div className="mt-2"><ReasonPie values={s.categories} /></div>
              </section>
            )}

            {areas.map((a, i) => (
              <section key={i} className="mt-4 rounded-xl bg-gray-50 p-3">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0c2b4c] text-xs text-white" aria-label={`Area ${i + 1} on the slide`}>{i + 1}</span>
                  {a.students} {plural(a.students, "student")} contributed
                </h3>
                <div className="mt-2"><ReasonPie values={a.reasons} /></div>
                {a.otherAnswers.length > 0 && (
                  <>
                    <p className="mt-2 text-xs font-bold text-gray-600">&ldquo;Other&rdquo; in their own words</p>
                    <Responses answers={a.otherAnswers} />
                  </>
                )}
              </section>
            ))}

            {elsewhere.length > 0 && (
              <section className="mt-4">
                <h3 className="text-sm font-bold">&ldquo;Other&rdquo; responses {areas.length ? "elsewhere on the slide" : "on this slide"}</h3>
                <Responses answers={elsewhere} />
              </section>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function SummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<Loaded | null>(); // undefined = loading, null = not found
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState(2); // a cluster = a spot marked by at least this many different students

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSession(sessionId);
      if (!session) return active && setData(null);
      const [bySlide, strokesBySlide] = await Promise.all([
        Promise.all(session.slides.map(s => getSlideSignals(sessionId, s.number))),
        Promise.all(session.slides.map(s => getAnnotations(sessionId, s.number))), // the instructor's pen strokes
      ]);
      if (active) setData({ session, bySlide, strokesBySlide });
    })().catch(e => active && setError(e instanceof Error ? e.message : "Couldn't load the summary."));
    return () => { active = false; };
  }, [sessionId]);

  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (data === undefined) return <main className="p-8 text-gray-600">Loading summary...</main>;
  if (data === null) return <main className="p-8"><HomeLogo /><h1 className="mt-6 text-3xl font-bold">Class not found</h1></main>;

  const { session, bySlide, strokesBySlide } = data;
  const total = slideStats(bySlide.flat());
  // The slider goes up to the most students who marked any one slide (at least 2), so every position means something.
  const maxThreshold = Math.max(2, ...bySlide.map(list => new Set(list.filter(sig => sig.kind === "region").map(sig => sig.studentId)).size));

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <HomeLogo />
        <Link href="/" className="rounded-xl border-2 border-[#0c2b4c] px-4 py-2 text-[#0c2b4c]">Back to home</Link>
      </header>
      <p className="text-sm font-bold tracking-widest text-[#3a6596]">CLASS SUMMARY</p>
      <h1 className="mt-1 text-3xl font-bold">{session.title}</h1>
      <p className="mt-2 text-gray-600">
        <b>{total.students}</b> {total.students === 1 ? "student has" : "students have"} made annotations in this session.
      </p>
      <section className="mt-4 max-w-md">
        <label htmlFor="spot-threshold" className="block text-sm font-bold">
          {threshold === 1 ? "Showing every spot students marked" : `Showing confusion spots marked by ${threshold}+ students`}
        </label>
        <input id="spot-threshold" type="range" min={1} max={maxThreshold} step={1} value={Math.min(threshold, maxThreshold)}
          onChange={e => setThreshold(Number(e.target.value))} className="mt-2 w-full accent-[#0c2b4c]" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Fewer students&apos; annotations</span>
          <span>More students&apos; annotations</span>
        </div>
      </section>

      <ol className="mt-4 space-y-4">
        {session.slides.map((slide, i) => <SlideSummary key={slide.number} slide={slide} signals={bySlide[i]} strokes={strokesBySlide[i]} threshold={threshold} />)}
      </ol>
    </main>
  );
}
