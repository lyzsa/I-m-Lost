"use client";
// Student join form (PLAN.md step B1). The code is pre-filled from /join?code=XXXXXX so the QR code works.
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinSession } from "@/lib/api";

export default function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError("Type the code your professor shows"); return; }
    setBusy(true);
    setError("");
    try {
      const session = await joinSession(code, name);
      router.push(`/class/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  }

  return (
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
          className="mt-2 w-full rounded-xl border-2 border-gray-200 p-4 text-center font-mono text-3xl tracking-[0.3em] uppercase focus:border-emerald-600 focus:outline-none"
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
          className="mt-2 w-full rounded-xl border-2 border-gray-200 p-4 text-lg focus:border-emerald-600 focus:outline-none"
        />
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-900 p-4 text-lg font-bold text-white">
        {busy ? "Joining..." : "Join class"}
      </button>
    </form>
  );
}
