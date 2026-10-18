"use client";
import { useRef, useState } from "react";
import { MAX_PAGES } from "./pdfToSlides";

type Props = {
  file: File | null;
  pages?: number;            // shown once known
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
};

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

// Big, obvious PDF picker: a dashed drop area that is itself the "Choose a PDF" button. Once a file is chosen it
// shows as a card with a Remove button, so the instructor can clear it and pick another.
export function PdfPicker({ file, pages, disabled, onPick, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [wrongType, setWrongType] = useState(false);

  function take(f: File | undefined) {
    if (!f) return;
    if (!isPdf(f)) { setWrongType(true); return; }
    setWrongType(false);
    onPick(f);
  }

  if (file)
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-[#3a6596] bg-[#eef3f9] p-4">
        <span className="grid h-12 w-10 shrink-0 place-items-center rounded-md bg-red-600 text-xs font-bold text-white">PDF</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{file.name}</p>
          <p className="text-sm text-gray-600">{sizeLabel(file.size)}{pages !== undefined && ` · ${pages} ${pages === 1 ? "page" : "pages"}`}</p>
        </div>
        <button className="shrink-0 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-bold" disabled={disabled}
          onClick={() => { if (input.current) input.current.value = ""; onRemove(); }}>
          Remove
        </button>
      </div>
    );

  return (
    <div>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden disabled={disabled}
        onChange={e => take(e.target.files?.[0])} />
      <button type="button" disabled={disabled} onClick={() => input.current?.click()}
        className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-4 py-5 transition-colors ${dragging ? "border-[#3a6596] bg-[#eef3f9]" : "border-[#c5d3e3] bg-white hover:bg-[#f6f8fb]"}`}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) take(e.dataTransfer.files[0]); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
          className="h-12 w-12" aria-hidden>
          <path d="M14 2.5H7A2.5 2.5 0 0 0 4.5 5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8z" />
          <path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h7" />
        </svg>
        <span className="mt-2 text-lg font-bold">Choose a PDF</span>
        <span className="text-sm text-gray-500">PDF · up to {MAX_PAGES} pages</span>
      </button>
      {wrongType && <p role="alert" className="mt-2 text-sm text-red-700">That isn&apos;t a PDF. Export your slides as PDF first.</p>}
    </div>
  );
}
