"use client";
// My Review (PLAN.md step B6). Owner: Person B.
// Only this student's own marks, grouped by slide, plus an AI study guide made from them.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { explainSignal, getMySignals, getSession, makeStudyGuide, type Session, type Signal } from "@/lib/api";
import { RectBox, SlideView } from "@/components/SlideView";

type Guide = { status: "idle" | "writing" | "done" | "error"; text: string };

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [mine, setMine] = useState<Signal[]>([]);
  const [guide, setGuide] = useState<Guide>({ status: "idle", text: "" });
  const [explaining, setExplaining] = useState<Record<string, "thinking" | "error">>({});

  useEffect(() => {
    getSession(sessionId).then(setSession).catch(() => setSession(null));
    getMySignals(sessionId).then(setMine).catch(() => {});
  }, [sessionId]);

  if (session === undefined) return <p className="p-8 text-center text-gray-500">Loading your review...</p>;
  if (session === null)
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Class not found</h1>
        <Link href="/join" className="mt-6 inline-block rounded-xl bg-emerald-900 px-6 py-3 text-white">Join another class</Link>
      </main>
    );

  const slideNumbers = [...new Set(mine.map(s => s.slideNumber))].sort((a, b) => a - b);

  async function writeGuide() {
    setGuide({ status: "writing", text: "" });
    try {
      setGuide({ status: "done", text: await makeStudyGuide(sessionId) });
    } catch {
      setGuide({ status: "error", text: "" });
    }
  }

  async function explain(id: string) {
    setExplaining(e => ({ ...e, [id]: "thinking" }));
    try {
      const text = await explainSignal(id);
      setMine(m => m.map(s => (s.id === id ? { ...s, explanation: text } : s)));
      setExplaining(e => { const next = { ...e }; delete next[id]; return next; });
    } catch {
      setExplaining(e => ({ ...e, [id]: "error" }));
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 pb-10 md:p-6">
      <header>
        <Link href={`/class/${session.id}`} className="text-sm text-gray-600">← Back to class</Link>
        <h1 className="mt-1 text-2xl font-bold">My Review</h1>
        <p className="text-gray-600">{session.title} · only you can see this page</p>
      </header>

      {mine.length === 0 ? (
        <p className="rounded-xl bg-white p-4 shadow-sm">You didn&apos;t mark anything in this class, so there&apos;s nothing to review yet.</p>
      ) : (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">Study guide</h2>
          <p className="text-sm text-gray-600">Built only from the {mine.length} thing{mine.length === 1 ? "" : "s"} you marked.</p>
          {guide.status === "done" ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-emerald-50 p-3">{guide.text}</p>
          ) : (
            <>
              <button onClick={writeGuide} disabled={guide.status === "writing"} className="mt-3 w-full rounded-xl bg-emerald-900 p-4 text-lg font-bold text-white">
                {guide.status === "writing" ? "Writing your study guide..." : guide.status === "error" ? "Try again" : "Make my study guide"}
              </button>
              {guide.status === "error" && <p role="alert" className="mt-2 text-center text-red-700">Couldn&apos;t make the study guide. Try again.</p>}
            </>
          )}
        </section>
      )}

      {slideNumbers.map(n => {
        const items = mine.filter(s => s.slideNumber === n).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const slide = session.slides[n - 1];
        return (
          <section key={n} className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Slide {n}</h2>
            {slide && (
              <SlideView imageUrl={slide.imageUrl} alt={`Slide ${n}`} className="mt-2">
                {items.filter(s => s.rect).map(s => <RectBox key={s.id} rect={s.rect!} className="rounded-sm border-2 border-orange-500 bg-orange-500/15" />)}
              </SlideView>
            )}
            <ul className="mt-3 space-y-3">
              {items.map(s => (
                <li key={s.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="font-bold">{s.kind === "lost" ? "I'm Lost on this slide" : s.categories.join(" · ")}</p>
                  {s.explanation ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm">{s.explanation}</p>
                  ) : s.kind === "region" && (
                    <button
                      onClick={() => explain(s.id)}
                      disabled={explaining[s.id] === "thinking"}
                      className="mt-2 rounded-lg border-2 border-emerald-900 px-3 py-1 text-sm font-bold text-emerald-900"
                    >
                      {explaining[s.id] === "thinking" ? "Thinking..." : "Explain this"}
                    </button>
                  )}
                  {explaining[s.id] === "error" && <p className="mt-1 text-sm text-red-700">Couldn&apos;t get an explanation. Try again.</p>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
