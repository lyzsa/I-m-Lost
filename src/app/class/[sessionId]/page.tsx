"use client";
// Student live screen (PLAN.md step B2). Owner: Person B.
// While `following`, the phone shows the professor's live slide. Back/Forward stop following;
// "Back to Live" starts following again.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, subscribeToSession, type Session } from "@/lib/api";
import { SlideView } from "@/components/SlideView";

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [following, setFollowing] = useState(true);
  const [viewing, setViewing] = useState(1); // only used while not following

  useEffect(() => {
    getSession(sessionId).then(setSession).catch(() => setSession(null));
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
  const shown = following ? live : viewing;
  const slide = session.slides[shown - 1];

  function browse(to: number) {
    setFollowing(false);
    setViewing(Math.max(1, Math.min(total, to)));
  }

  return (
    <main className="mx-auto max-w-3xl p-3 pb-8 md:p-6">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="truncate text-lg font-bold">{session.title}</h1>
        <span className="shrink-0 text-sm text-gray-600">Slide {shown} / {total}</span>
      </header>

      {session.phase === "ended" ? (
        <div className="mb-3 rounded-xl bg-emerald-900 p-4 text-white">
          <p className="font-bold">Class ended</p>
          <Link href={`/class/${session.id}/review`} className="mt-3 block rounded-lg bg-white p-3 text-center font-bold text-emerald-900">
            Open My Review →
          </Link>
        </div>
      ) : !following ? (
        <button onClick={() => setFollowing(true)} className="mb-3 flex w-full items-center justify-between rounded-xl bg-amber-100 p-3 text-left">
          <span>Class is on slide {live}.</span>
          <b className="rounded-lg bg-emerald-900 px-3 py-1 text-white">Back to Live</b>
        </button>
      ) : session.phase === "reviewing" ? (
        <p className="mb-3 rounded-xl bg-sky-100 p-3 text-sm">Professor is reviewing feedback</p>
      ) : null}

      <SlideView imageUrl={slide.imageUrl} alt={`Slide ${shown}`} />

      <nav className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => browse(shown - 1)} disabled={shown === 1} className="rounded-xl bg-white p-4 text-lg font-bold shadow-sm">← Back</button>
        <button onClick={() => browse(shown + 1)} disabled={shown === total} className="rounded-xl bg-white p-4 text-lg font-bold shadow-sm">Forward →</button>
      </nav>
      {following && session.phase !== "ended" && <p className="mt-2 text-center text-sm text-gray-500">Following the professor live</p>}
    </main>
  );
}
