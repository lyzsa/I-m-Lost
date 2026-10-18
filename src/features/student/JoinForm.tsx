"use client";
// Student join form (docs/build-plan.md step B1). The code is pre-filled from /join?code=XXXXXX so the QR code works.
// If this device already joined a class that is still running, go straight back to it, unless the student
// came here to switch (/join?switch=1) or opened a different class's code.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, joinSession } from "@/lib/api";
import { lastClass, rememberClass, type LastClass } from "./lastClass";

export default function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const urlCode = (params.get("code") ?? "").toUpperCase();
  const switching = params.has("switch");
  const [code, setCode] = useState(urlCode);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true); // looking up the remembered class
  const [previous, setPrevious] = useState<{ last: LastClass; ended: boolean } | null>(null);

  useEffect(() => {
    const last = lastClass();
    if (!last) { setChecking(false); return; }
    const goBack = !switching && (!urlCode || urlCode === last.code);
    getSession(last.id)
      .then(session => {
        if (!session) { setChecking(false); return; }
        if (goBack && session.phase !== "ended") { router.replace(`/class/${session.id}`); return; }
        setPrevious({ last, ended: session.phase === "ended" });
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router, switching, urlCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError("Type the code your instructor shows"); return; }
    setBusy(true);
    setError("");
    try {
      const session = await joinSession(code, name);
      rememberClass(session);
      router.push(`/class/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  }

  if (checking) return <p className="rounded-2xl bg-white p-5 text-gray-500">Loading...</p>;

  return (
    <>
      {previous && (
        previous.ended ? (
          <div className="mb-4 rounded-2xl bg-[#eef3f9] p-4">
            <p>Your last class, <b>{previous.last.title}</b>, has ended.</p>
            <Link href={`/class/${previous.last.id}/review`} className="mt-2 inline-block font-bold text-[#0c2b4c] underline">Open My Review →</Link>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="font-bold">You still have a class in progress</p>
            <p className="mt-1 text-gray-700">
              <b>{previous.last.title}</b> (code {previous.last.code}) is still running. Joining a new class takes you out of it.
            </p>
            <Link href={`/class/${previous.last.id}`} className="mt-3 block rounded-xl bg-[#0c2b4c] p-3 text-center font-bold text-white">
              Go back to {previous.last.title}
            </Link>
          </div>
        )
      )}
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-bold">Class code</span>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="K7Q2PX"
            className="mt-2 w-full rounded-xl border-2 border-gray-200 p-4 text-center font-mono text-3xl tracking-[0.3em] uppercase focus:border-[#3a6596] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Your name <span className="font-normal text-gray-500">(optional)</span></span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoComplete="given-name"
            placeholder="Alex"
            className="mt-2 w-full rounded-xl border-2 border-gray-200 p-4 text-lg focus:border-[#3a6596] focus:outline-none"
          />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#0c2b4c] p-4 text-lg font-bold text-white">
          {busy ? "Joining..." : "Join class"}
        </button>
      </form>
    </>
  );
}
