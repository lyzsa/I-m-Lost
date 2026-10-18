"use client";
// Draw mode controls: on/off, pen colour, thin/thick, Undo, Clear slide (with a confirm).
import { useState } from "react";

export const PEN_COLORS = [
  { name: "Red", value: "#e34948" },
  { name: "Blue", value: "#2a78d6" },
  { name: "Black", value: "#17251e" },
] as const;
export const PEN_WIDTHS = [
  { name: "Thin", value: 0.004 },
  { name: "Thick", value: 0.009 },
] as const;

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

type Props = {
  drawing: boolean; onToggle: () => void;
  color: string; onColor: (c: string) => void;
  width: number; onWidth: (w: number) => void;
  canUndo: boolean; onUndo: () => void;
  hasStrokes: boolean; onClear: () => void;
};

export function DrawToolbar({ drawing, onToggle, color, onColor, width, onWidth, canUndo, onUndo, hasStrokes, onClear }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div className="flex select-none flex-wrap items-center gap-2 rounded-xl bg-white p-1.5 text-sm"
      style={{ WebkitTouchCallout: "none" /* iPad: no Copy / Look Up menu on long press */ }}>
      <button aria-pressed={drawing} onClick={onToggle}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-bold ${drawing ? "bg-amber-400 text-gray-900" : "hover:bg-gray-100"}`}>
        <PenIcon /> {drawing ? "Drawing (click to stop)" : "Draw on slide"}
      </button>
      {drawing && (
        <>
          {PEN_COLORS.map(c => (
            <button key={c.value} aria-label={`${c.name} pen`} aria-pressed={color === c.value} onClick={() => onColor(c.value)}
              className={`h-7 w-7 rounded-full border-2 ${color === c.value ? "border-gray-900 ring-2 ring-offset-1 ring-gray-900" : "border-white"}`}
              style={{ background: c.value }} />
          ))}
          <span className="mx-1 h-6 w-px bg-gray-200" />
          {PEN_WIDTHS.map(w => (
            <button key={w.value} aria-pressed={width === w.value} onClick={() => onWidth(w.value)}
              className={`rounded-lg px-2 py-1 ${width === w.value ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>{w.name}</button>
          ))}
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <button className="rounded-lg px-2 py-1 hover:bg-gray-100" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl/Cmd+Z)">Undo</button>
          {confirmClear ? (
            <span className="flex items-center gap-1">
              Clear this slide?
              <button className="rounded-lg bg-red-700 px-2 py-1 font-bold text-white" onClick={() => { onClear(); setConfirmClear(false); }}>Yes</button>
              <button className="rounded-lg px-2 py-1 hover:bg-gray-100" onClick={() => setConfirmClear(false)}>No</button>
            </span>
          ) : (
            <button className="rounded-lg px-2 py-1 text-red-800 hover:bg-red-50" disabled={!hasStrokes} onClick={() => setConfirmClear(true)}>Clear slide</button>
          )}
        </>
      )}
    </div>
  );
}
