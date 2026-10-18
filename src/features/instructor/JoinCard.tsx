"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { countStudents } from "@/lib/api";

// Join code, QR code, link and how many students have joined. Readable from the back of the room;
// "Show large" fills the screen with the QR code for the projector.
export function JoinCard({ sessionId, code }: { sessionId: string; code: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join?code=${code}`;
  const [joined, setJoined] = useState<number>();
  const [large, setLarge] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => countStudents(sessionId).then(n => { if (active) setJoined(n); }).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [sessionId]);

  return (
    <section className="rounded-2xl bg-white p-5 text-center shadow-sm">
      <p className="text-sm font-bold tracking-widest text-[#3a6596]">JOIN CODE</p>
      <p className="my-2 font-mono text-5xl font-bold tracking-[0.2em]">{code}</p>
      <button className="mx-auto block rounded-lg p-1 hover:bg-gray-50" onClick={() => setLarge(true)} aria-label="Show QR code large">
        <QRCodeSVG value={joinUrl} size={150} marginSize={1} />
      </button>
      <p className="mt-1 break-all text-xs text-gray-600">{joinUrl}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <span><b>{joined ?? "–"}</b> {joined === 1 ? "student" : "students"} joined</span>
        <button className="rounded-lg bg-gray-100 px-3 py-1" onClick={() => setLarge(true)}>Show large</button>
      </div>

      {large && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6" onClick={() => setLarge(false)}>
          <p className="text-xl font-bold tracking-widest text-[#3a6596]">SCAN TO JOIN</p>
          <QRCodeSVG value={joinUrl} size={420} marginSize={2} className="h-auto max-h-[60vh] w-auto max-w-full" />
          <p className="font-mono text-6xl font-bold tracking-[0.2em]">{code}</p>
          <p className="text-gray-600">{joinUrl}</p>
          <button className="rounded-xl bg-[#0c2b4c] px-6 py-3 font-bold text-white">Close</button>
        </div>
      )}
    </section>
  );
}
