"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSession, getSlideSignals, type Session, type Signal } from "@/lib/api";
import { categories, type Category } from "@/lib/domain";
import { SlideView } from "@/components/SlideView";
import { ClusterOutlines } from "@/features/professor/DenseAreaLayer";
import { findDenseAreas, type DenseArea } from "@/features/professor/denseAreas";
import { HeatmapLayer } from "@/features/professor/HeatmapLayer";
import { HomeLogo } from "@/features/professor/HomeLogo";
import { ReasonPie } from "@/features/professor/ReasonPie";
import { otherAnswers, slideStats } from "@/features/professor/stats";

type Loaded = { session: Session; bySlide: Signal[][] };
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

function ReasonBars({ values }: { values: Record<Category, number> }) {
  const shown = categories.filter(c => values[c] > 0).sort((a, b) => values[b] - values[a]);
  const max = Math.max(1, ...shown.map(c => values[c]));
  return (
    <ul className="mt-1.5 space-y-1 text-sm">
      {shown.map(c => (
        <li key={c} className="grid grid-cols-[11rem_1fr_2rem] items-center gap-2">
          <span>{c}</span>
          <span className="h-2 rounded-full bg-gray-100"><span className="block h-2 rounded-full bg-orange-400" style={{ width: `${(values[c] / max) * 100}%` }} /></span>
          <b className="text-right">{values[c]}</b>
        </li>
      ))}
    </ul>
  );
}

function SlideSummary({ slide, signals, threshold }: { slide: Session["slides"][number]; signals: Signal[]; threshold: number }) {
  const s = slideStats(signals);
  const areas: DenseArea[] = useMemo(() => findDenseAreas(signals, threshold), [signals, threshold]);
  const inAnyArea = new Set(areas.flatMap(a => a.signalIds));
  const elsewhere = otherAnswers(signals.filter(sig => !inAnyArea.has(sig.id)));

  return (
    <li className="grid gap-5 rounded-2xl bg-white p-4 md:grid-cols-[minmax(0,380px)_1fr]">
      <div>
        <SlideView imageUrl={slide.imageUrl} alt={`Slide ${slide.number} with students' marks`} className="rounded-lg">
          <HeatmapLayer signals={signals} />
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
                <ReasonBars values={s.categories} />
              </section>
            )}

            {areas.map((a, i) => (
              <section key={i} className="mt-4 rounded-xl bg-gray-50 p-3">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-800 text-xs text-white" aria-label={`Area ${i + 1} on the slide`}>{i + 1}</span>
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
      const bySlide = await Promise.all(session.slides.map(s => getSlideSignals(sessionId, s.number)));
      if (active) setData({ session, bySlide });
    })().catch(e => active && setError(e instanceof Error ? e.message : "Couldn't load the summary."));
    return () => { active = false; };
  }, [sessionId]);

  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (data === undefined) return <main className="p-8 text-gray-600">Loading summary...</main>;
  if (data === null) return <main className="p-8"><HomeLogo /><h1 className="mt-6 text-3xl font-bold">Class not found</h1></main>;

  const { session, bySlide } = data;
  const total = slideStats(bySlide.flat());
  // The slider goes up to the most students who marked any one slide (at least 2), so every position means something.
  const maxThreshold = Math.max(2, ...bySlide.map(list => new Set(list.filter(sig => sig.kind === "region").map(sig => sig.studentId)).size));

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <HomeLogo />
        <Link href="/" className="rounded-xl border-2 border-emerald-900 px-4 py-2 text-emerald-900">Back to home</Link>
      </header>
      <p className="text-sm font-bold tracking-widest text-emerald-700">CLASS SUMMARY</p>
      <h1 className="mt-1 text-3xl font-bold">{session.title}</h1>
      <p className="mt-2 text-gray-600">
        <b>{total.students}</b> {total.students === 1 ? "student has" : "students have"} made annotations in this session.
      </p>
      <section className="mt-4 max-w-md">
        <label htmlFor="spot-threshold" className="block text-sm font-bold">
          {threshold === 1 ? "Showing every spot students marked" : `Showing confusion spots marked by ${threshold}+ students`}
        </label>
        <input id="spot-threshold" type="range" min={1} max={maxThreshold} step={1} value={Math.min(threshold, maxThreshold)}
          onChange={e => setThreshold(Number(e.target.value))} className="mt-2 w-full accent-emerald-800" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>More spots</span>
          <span>Only the busiest</span>
        </div>
      </section>

      <ol className="mt-4 space-y-4">
        {session.slides.map((slide, i) => <SlideSummary key={slide.number} slide={slide} signals={bySlide[i]} threshold={threshold} />)}
      </ol>
    </main>
  );
}
