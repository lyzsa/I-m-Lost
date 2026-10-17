"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSession, getSlideSignals, type Session, type Signal } from "@/lib/api";
import { categories } from "@/lib/domain";
import { HomeLogo } from "@/features/professor/HomeLogo";
import { OtherResponsesModal, ViewResponsesButton, type ResponsesView } from "@/features/professor/OtherResponses";
import { otherAnswers, slideStats } from "@/features/professor/stats";

type Loaded = { session: Session; bySlide: Signal[][] };
const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

export default function SummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<Loaded | null>(); // undefined = loading, null = not found
  const [error, setError] = useState("");
  const [responses, setResponses] = useState<ResponsesView>();

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

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <HomeLogo />
        <Link href="/" className="rounded-xl border-2 border-emerald-900 px-4 py-2 text-emerald-900">Back to home</Link>
      </header>
      <p className="text-sm font-bold tracking-widest text-emerald-700">CLASS SUMMARY</p>
      <h1 className="mt-1 text-3xl font-bold">{session.title}</h1>
      <p className="mt-2 text-gray-600">
        Whole class: <b>{total.lost}</b> I&apos;m Lost · <b>{total.boxes}</b> {total.boxes === 1 ? "box" : "boxes"} · <b>{total.students}</b> {plural(total.students, "student")} gave feedback
      </p>
      <p className="mt-1 text-xs text-gray-500">Counts are taps and boxes, not students. One box can count in several categories.</p>

      <ol className="mt-6 space-y-4">
        {session.slides.map((slide, i) => {
          const s = slideStats(bySlide[i]);
          return (
            <li key={slide.number} className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-[200px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.imageUrl} alt={`Slide ${slide.number}`} className="w-full rounded-lg border" />
              <div>
                <h2 className="font-bold">Slide {slide.number}</h2>
                <p className="mt-1">
                  <b>{s.lost}</b> I&apos;m Lost · <b>{s.boxes}</b> {s.boxes === 1 ? "box" : "boxes"} · <b>{s.students}</b> {plural(s.students, "student")}
                </p>
                {s.boxes > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                    {categories.map(c => (
                      <li key={c} className="rounded-full bg-orange-100 px-3 py-1">{c}: <b>{s.categories[c]}</b></li>
                    ))}
                  </ul>
                )}
                <ViewResponsesButton count={otherAnswers(bySlide[i]).length} className="mt-3 text-sm"
                  onClick={() => setResponses({ title: `Slide ${slide.number}`, answers: otherAnswers(bySlide[i]) })} />
                {s.lost + s.boxes === 0 && <p className="mt-1 text-sm text-gray-500">No feedback on this slide.</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {responses && <OtherResponsesModal view={responses} onClose={() => setResponses(undefined)} />}
    </main>
  );
}
