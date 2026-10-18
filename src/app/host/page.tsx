"use client";
/* eslint-disable @next/next/no-img-element -- fixed decorative art from public/landing, like the landing page */
// Instructor start page. Same look as the student join page: the crest, navy ink, a white card on warm off-white.
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";
import { CANCELLED, MAX_PAGES, countPdfPages, pdfToSlides } from "@/features/instructor/pdfToSlides";
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
    <main className="min-h-svh bg-[#faf9f7] text-[#0c2b4c]">
      <div className="mx-auto max-w-md px-4 pb-10 pt-8">
        <Link href="/" aria-label="LOST home" className="mx-auto block w-fit">
          <img src="/landing/crest.webp" alt="I'm Lost crest" draggable={false} className="h-32 w-auto select-none" />
        </Link>
        <h1 className="mt-4 text-center text-3xl font-bold">Start your class</h1>
        <p className="mb-6 mt-1 text-center text-gray-600">Upload your slides to get started.</p>
        <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-bold">Class title</span>
            <input className="mt-2 w-full rounded-xl border-2 border-gray-200 p-4 text-lg focus:border-[#3a6596] focus:outline-none"
              placeholder="e.g. Pointers 101" value={title} onChange={e => setTitle(e.target.value)} disabled={busy} />
          </label>
          <div>
            <p className="mb-2 text-sm font-bold">Slides</p>
            <PdfPicker file={file} pages={pages} disabled={busy} onPick={pick} onRemove={remove} />
          </div>
          <button className="w-full rounded-xl bg-[#0c2b4c] p-4 text-lg font-bold text-white"
            disabled={!file || busy || unusable} onClick={create}>
            {busy ? "Working..." : "Create class"}
          </button>
          {stage === "converting" && (
            <button className="w-full rounded-xl border-2 border-gray-300 p-3 font-bold" onClick={() => cancel.current?.abort()}>
              Cancel
            </button>
          )}
          <p role="status" className="text-sm text-[#3a6596] empty:hidden">{status}</p>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        </div>
        <MyClassesList />
      </div>
    </main>
  );
}
