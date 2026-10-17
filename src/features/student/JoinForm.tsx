"use client";
// Student join form (PLAN.md step B1). The code is pre-filled from /join?code=XXXXXX so the QR code works.
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinSession } from "@/lib/api";
import { LostChick, type ChickMood } from "./LostChick";

export default function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState(false);
  const [error, setError] = useState("");

  const mood: ChickMood = found ? "found" : error ? "dizzy" : busy ? "thinking" : "lost";
  const bubble = {
    lost: "Uh oh… I'm lost too! What's the class code?",
    thinking: "Looking for your class…",
    found: "Found it! Let's go!",
    dizzy: error,
  }[mood];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError("Type the code your professor shows"); return; }
    setBusy(true);
    setError("");
    try {
      const session = await joinSession(code, name);
      setFound(true);
      router.push(`/class/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      {/* the chick and its speech bubble */}
      <div className="flex flex-col items-center">
        <div
          role={mood === "dizzy" ? "alert" : "status"}
          className={`relative mb-4 max-w-[18rem] rounded-3xl border-2 px-5 py-3 text-center text-lg font-bold shadow-sm ${
            mood === "dizzy" ? "border-rose-300 bg-rose-50 text-rose-600" : "border-amber-200 bg-white text-amber-900"}`}
        >
          {mood === "dizzy" && <span aria-hidden>Hmm… </span>}{bubble}
          <span aria-hidden className={`absolute -bottom-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r-2 border-b-2 ${
            mood === "dizzy" ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-white"}`} />
        </div>
        <LostChick mood={mood} className="h-48 w-48" />
      </div>

      <form onSubmit={onSubmit} className="mt-2 space-y-5 rounded-[2rem] border-2 border-amber-100 bg-white/90 p-6 shadow-[0_8px_0_#fde68a]">
        <label className="block">
          <span className="font-bold text-amber-900">Class code</span>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="K7Q2PX"
            className="mt-2 w-full rounded-2xl border-[3px] border-amber-200 bg-amber-50/60 p-4 text-center text-3xl font-black tracking-[0.3em] tabular-nums text-amber-950 uppercase placeholder:text-amber-200 focus:border-orange-400 focus:bg-white focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="font-bold text-amber-900">What should we call you? <span className="font-normal text-amber-700/70">(optional)</span></span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoComplete="given-name"
            placeholder="Alex"
            className="mt-2 w-full rounded-2xl border-[3px] border-amber-200 bg-amber-50/60 p-4 text-lg text-amber-950 placeholder:text-amber-300 focus:border-orange-400 focus:bg-white focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full border-b-[6px] border-orange-600 bg-orange-400 p-4 text-xl font-bold text-white transition active:translate-y-1 active:border-b-2"
        >
          {found ? "Found it! 🎉" : busy ? "Searching…" : "Find my class →"}
        </button>
      </form>
    </>
  );
}
