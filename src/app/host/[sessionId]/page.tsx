"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSession, subscribeToSession, type Session } from "@/lib/api";
import { SlideView } from "@/components/SlideView";
import { HomeLogo } from "@/features/professor/HomeLogo";
import { JoinCard } from "@/features/professor/JoinCard";
import { LiveControls } from "@/features/professor/LiveControls";

export default function HostLivePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(); // undefined = loading, null = not found

  useEffect(() => {
    let active = true;
    getSession(sessionId).then(s => { if (active) setSession(s); }).catch(() => { if (active) setSession(null); });
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

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <HomeLogo />
          <h1 className="text-2xl font-bold">{session.title}</h1>
        </div>
        <span className="text-sm text-gray-600">Professor view</span>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <SlideView imageUrl={slide.imageUrl} alt={`Slide ${slide.number}`} />
        <aside className="space-y-4">
          <JoinCard code={session.code} />
          <LiveControls session={session} onChange={setSession} />
        </aside>
      </div>
    </main>
  );
}
