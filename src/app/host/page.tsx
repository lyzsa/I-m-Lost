"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";
import { CANCELLED, MAX_PAGES, countPdfPages, pdfToSlides } from "@/features/instructor/pdfToSlides";
import { HomeLogo } from "@/features/instructor/HomeLogo";
import { MyClassesList } from "@/features/instructor/MyClassesList";
import { PdfPicker } from "@/features/instructor/PdfPicker";
import { rememberClass } from "@/features/instructor/myClasses";

export default function HostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"idle" | "converting" | "creating">("idle");
  const cancel = useRef<AbortController | null>(null);
  const busy = stage !== "idle";

  async function pick(f: File) {
    setFile(f);
    setPages(undefined);
    setError("");
    setStatus("");
    try {
      const n = await countPdfPages(f);
      setPages(n);
      if (n > MAX_PAGES) setError(`That PDF has ${n} pages. The limit is ${MAX_PAGES}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  function remove() {
    setFile(null);
    setPages(undefined);
    setError("");
    setStatus("");
  }

  async function create() {
    if (!file) return;
    cancel.current = new AbortController();
    setStage("converting");
    setError("");
    try {
      const slides = await pdfToSlides(file, (page, total) => setStatus(`Converting page ${page} of ${total}...`), cancel.current.signal);
      setStage("creating");
      setStatus("Uploading slides and creating the class...");
      const session = await createSession(title || file.name.replace(/\.pdf$/i, ""), slides);
      rememberClass(session);
      router.push(`/host/${session.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(message === CANCELLED ? "" : message);
      setStatus(message === CANCELLED ? "Cancelled. Your file is still selected." : "");
      setStage("idle");
    }
  }

  const unusable = pages === undefined || pages > MAX_PAGES; // still checking, unreadable, or too long

  return (
    <main className="mx-auto max-w-xl p-8">
      <HomeLogo />
      <p className="mt-10 text-sm font-bold tracking-widest text-emerald-700">INSTRUCTOR</p>
      <h1 className="mt-2 text-4xl font-bold">Start a class</h1>
      <div className="mt-8 space-y-5 rounded-2xl bg-white p-6">
        <label className="block">
          <span className="font-bold">Class title</span>
          <input className="mt-2 w-full rounded-lg border p-3" placeholder="e.g. Pointers 101" value={title}
            onChange={e => setTitle(e.target.value)} disabled={busy} />
        </label>
        <div>
          <p className="mb-2 font-bold">Slides</p>
          <PdfPicker file={file} pages={pages} disabled={busy} onPick={pick} onRemove={remove} />
        </div>
        <button className="w-full rounded-xl bg-emerald-900 p-4 text-lg text-white" disabled={!file || busy || unusable} onClick={create}>
          {busy ? "Working..." : "Create class"}
        </button>
        {stage === "converting" && (
          <button className="w-full rounded-xl border-2 border-gray-300 p-3" onClick={() => cancel.current?.abort()}>
            Cancel
          </button>
        )}
        <p role="status" className="text-sm text-emerald-800">{status}</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
      <MyClassesList />
    </main>
  );
}
