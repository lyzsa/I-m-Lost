"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";
import { pdfToSlides } from "@/features/professor/pdfToSlides";

export default function HostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const slides = await pdfToSlides(file, (page, total) => setStatus(`Converting page ${page} of ${total}...`));
      setStatus("Creating the class...");
      const session = await createSession(title || file.name.replace(/\.pdf$/i, ""), slides);
      router.push(`/host/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setStatus("");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8 pt-16">
      <p className="text-sm font-bold tracking-widest text-emerald-700">PROFESSOR</p>
      <h1 className="mt-2 text-4xl font-bold">Start a class</h1>
      <div className="mt-8 space-y-5 rounded-2xl bg-white p-6">
        <label className="block">
          <span className="font-bold">Class title</span>
          <input className="mt-2 w-full rounded-lg border p-3" placeholder="e.g. Pointers 101" value={title}
            onChange={e => setTitle(e.target.value)} disabled={busy} />
        </label>
        <label className="block">
          <span className="font-bold">Slides (PDF, up to 20 pages)</span>
          <input className="mt-2 block w-full text-sm" type="file" accept="application/pdf,.pdf" disabled={busy}
            onChange={e => { setFile(e.target.files?.[0] ?? null); setError(""); }} />
        </label>
        <button className="w-full rounded-xl bg-emerald-900 p-4 text-lg text-white" disabled={!file || busy} onClick={create}>
          {busy ? "Working..." : "Create class"}
        </button>
        <p role="status" className="text-sm text-emerald-800">{status}</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}
