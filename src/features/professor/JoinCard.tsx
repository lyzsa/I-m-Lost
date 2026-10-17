"use client";
// Big join code + link, readable from the back of the room.
export function JoinCard({ code }: { code: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/join?code=${code}`;
  return (
    <section className="rounded-2xl bg-white p-5 text-center">
      <p className="text-sm font-bold tracking-widest text-emerald-700">JOIN CODE</p>
      <p className="my-2 font-mono text-5xl font-bold tracking-[0.2em]">{code}</p>
      <p className="break-all text-sm text-gray-600">{joinUrl}</p>
    </section>
  );
}
