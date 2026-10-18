"use client";
// My Review (docs/build-plan.md step B6). Owner: Person B.
// Only this student's own marks, grouped by slide, plus an AI study guide made from them.
// AI explanations start folded; a 💡 next to each slide (level with its box) or the item itself opens one.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { explainSignal, getMySignals, getSession, makeStudyGuide, type Session, type Signal } from "@/lib/api";
import { RectBox, SlideView } from "@/components/SlideView";
import { ExplainRail } from "@/features/student/ExplainRail";
import { InstructorInk } from "@/features/student/InstructorInk";
import { HomeLogo } from "@/features/instructor/HomeLogo"; // shared with the instructor screens so the logo matches

type Guide = { status: "idle" | "writing" | "done" | "error"; text: string }; // text = the guide, or why the AI failed

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [mine, setMine] = useState<Signal[]>([]);
  const [guide, setGuide] = useState<Guide>({ status: "idle", text: "" });
  const [explaining, setExplaining] = useState<Record<string, "thinking" | "error">>({});
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set()); // marks whose explanation is showing

  useEffect(() => {
    getSession(sessionId).then(setSession).catch(() => setSession(null));
    getMySignals(sessionId).then(setMine).catch(() => {});
  }, [sessionId]);

  if (session === undefined) return <p className="p-8 text-center text-gray-500">Loading your review...</p>;
  if (session === null)
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <HomeLogo />
        <h1 className="mt-6 text-2xl font-bold">Class not found</h1>
        <Link href="/join" className="mt-6 inline-block rounded-xl bg-[#0c2b4c] px-6 py-3 text-white">Join another class</Link>
      </main>
    );

  const slideNumbers = [...new Set(mine.map(s => s.slideNumber))].sort((a, b) => a - b);
  const explained = mine.filter(s => s.explanation);
  const allUnfolded = explained.length > 0 && explained.every(s => unfolded.has(s.id));

  function toggle(id: string) {
    setUnfolded(u => { const next = new Set(u); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  // 💡 next to the slide: open that explanation and bring it into view.
  function openFromRail(s: Signal) {
    setUnfolded(u => new Set(u).add(s.id));
    document.getElementById(`mark-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function writeGuide() {
    setGuide({ status: "writing", text: "" });
    try {
      setGuide({ status: "done", text: await makeStudyGuide(sessionId) });
    } catch (err) {
      setGuide({ status: "error", text: err instanceof Error ? err.message : "" });
    }
  }

  async function explain(id: string) {
    setExplaining(e => ({ ...e, [id]: "thinking" }));
    try {
      const text = await explainSignal(id);
      setMine(m => m.map(s => (s.id === id ? { ...s, explanation: text } : s)));
      setUnfolded(u => new Set(u).add(id)); // just asked: show it right away
      setExplaining(e => { const next = { ...e }; delete next[id]; return next; });
    } catch {
      setExplaining(e => ({ ...e, [id]: "error" }));
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 pb-10 text-[#0c2b4c] md:p-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <HomeLogo />
          <Link href={`/class/${session.id}`} className="text-sm text-gray-600">← Back to class</Link>
        </div>
        <h1 className="mt-4 text-2xl font-bold">My Review</h1>
        <p className="text-gray-600">{session.title} · only you can see this page</p>
      </header>

      {mine.length === 0 ? (
        <p className="rounded-xl bg-white p-4 shadow-sm">You didn&apos;t mark anything in this class, so there&apos;s nothing to review yet.</p>
      ) : (
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">Study guide</h2>
          <p className="text-sm text-gray-600">Built only from the {mine.length} thing{mine.length === 1 ? "" : "s"} you marked.</p>
          {guide.status === "done" ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#eef3f9] p-3">{guide.text}</p>
          ) : (
            <>
              <button onClick={writeGuide} disabled={guide.status === "writing"} className="mt-3 w-full rounded-xl bg-[#0c2b4c] p-4 text-lg font-bold text-white">
                {guide.status === "writing" ? "Writing your study guide..." : guide.status === "error" ? "Try again" : "Make my study guide"}
              </button>
              {guide.status === "error" && (
                <div role="alert" className="mt-2 text-center">
                  <p className="text-red-700">Couldn&apos;t make the study guide. Try again.</p>
                  {guide.text && <p className="mt-1 text-sm text-gray-600">{guide.text}</p>}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {explained.length > 0 && (
        <button
          onClick={() => setUnfolded(allUnfolded ? new Set() : new Set(explained.map(s => s.id)))}
          className="w-full rounded-xl border-2 border-[#0c2b4c] bg-white p-3 font-bold text-[#0c2b4c]"
        >
          {allUnfolded ? "Fold all AI explanations" : `💡 Show all AI explanations (${explained.length})`}
        </button>
      )}

      {slideNumbers.map(n => {
        const items = mine.filter(s => s.slideNumber === n).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const slide = session.slides[n - 1];
        return (
          <section key={n} className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Slide {n}</h2>
            {slide && (
              <div className="mt-2 flex gap-1.5">
                <SlideView imageUrl={slide.imageUrl} alt={`Slide ${n}`} className="min-w-0 flex-1">
                  <InstructorInk sessionId={session.id} slideNumber={n} />
                  {items.filter(s => s.rect).map(s => <RectBox key={s.id} rect={s.rect!} className="rounded-sm border-2 border-orange-500 bg-orange-500/15" />)}
                </SlideView>
                {items.some(s => s.rect && s.explanation) && (
                  <ExplainRail marks={items.filter(s => s.rect && s.explanation)} onOpen={openFromRail} />
                )}
              </div>
            )}
            <ul className="mt-3 space-y-3">
              {items.map(s => (
                <li key={s.id} id={`mark-${s.id}`} className="scroll-mt-4 rounded-lg bg-gray-50 p-3">
                  <p className="font-bold">
                    {s.kind === "lost"
                      ? "I'm Lost on this slide"
                      : s.categories.map(c => (c === "Other" && s.otherText ? `Other: "${s.otherText}"` : c)).join(" · ")}
                  </p>
                  {s.explanation ? (
                    <>
                      <button onClick={() => toggle(s.id)} aria-expanded={unfolded.has(s.id)} className="mt-2 text-sm font-bold text-[#0c2b4c]">
                        💡 {unfolded.has(s.id) ? "Hide AI explanation ▾" : "AI explanation ▸"}
                      </button>
                      {unfolded.has(s.id) && <p className="mt-2 whitespace-pre-wrap text-sm">{s.explanation}</p>}
                    </>
                  ) : s.kind === "region" && (
                    <button
                      onClick={() => explain(s.id)}
                      disabled={explaining[s.id] === "thinking"}
                      className="mt-2 rounded-lg border-2 border-[#0c2b4c] px-3 py-1 text-sm font-bold text-[#0c2b4c]"
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
