"use client";
/* eslint-disable @next/next/no-img-element -- plain images: fixed decorative art from public/landing */
// Landing page: the hand-drawn "I'm Lost." poster.
// Art lives in public/landing/. The title lettering and the three photos were cut out of the design mockup;
// the crest has a transparent background; the doodles are drawings on white, blended in with mix-blend-multiply.
// Landscape screens from 768 px: everything is placed in % of a 3:2 stage like the mockup, and text sizes use cqw
// so they scale with it. The middle (crest, title, tagline, buttons) stays put; the doodles around it float, and
// scrolling down drifts the photos and doodles off towards the screen edges (--p goes 0 → 1 over the scroll).
// Phones and portrait tablets: a simple column, without the big photos.
// Both play a short entrance (crest drops in, the squiggle draws itself, the rest rises in turn).
// "Reduce motion" turns all movement off.
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

const INK = "#0c2b4c";
const PAPER = "#f7f8f3"; // the mockup's background; the cut-out art has this behind it

// The stage is 3:2 like the mockup (1536 x 1024) and as wide as fits on one screen.
const STAGE = "min(100vw, 150svh)";

type Floating = {
  src: string;
  place: CSSProperties;     // where it sits
  drift: [number, number];  // where it ends up after scrolling down, in vw / vh
  float?: [number, number]; // gentle bobbing: seconds per cycle, delay
  tilt?: number;            // degrees
};

// Cut at the mockup's edges, so they hang off the screen corners, sized in units of the stage width. No bobbing.
const PHOTOS: Floating[] = [
  { src: "/landing/laptop.png", place: { right: 0, top: 0, width: `calc(${STAGE} * 0.245)` }, drift: [12, -35] },
  { src: "/landing/tower.png", place: { left: 0, bottom: 0, width: `calc(${STAGE} * 0.259)` }, drift: [-14, 35] },
  { src: "/landing/books.png", place: { right: 0, bottom: 0, width: `calc(${STAGE} * 0.152)` }, drift: [12, 35] },
];

// Doodles around the middle, positioned in % of the stage.
const DOODLES: Floating[] = [
  { src: "/landing/same-slide.webp", place: { left: "3.4%", top: "35%", width: "7.6%" }, drift: [-25, -12], float: [5.2, 0] },
  { src: "/landing/question-marks.webp", place: { left: "83.4%", top: "34.5%", width: "9.5%" }, drift: [25, -15], float: [4.6, 0.8] },
  { src: "/landing/im-lost-note.webp", place: { left: "90%", top: "63.6%", width: "8.6%" }, drift: [22, 10], float: [6, 0.4] },
  { src: "/landing/question-marks.webp", place: { left: "77.6%", top: "86.8%", width: "7%" }, drift: [16, 28], float: [5.4, 1.6] },
  { src: "/landing/dashes.webp", place: { left: "17.2%", top: "73%", width: "5%" }, drift: [-22, 18], float: [4.8, 1.1], tilt: -35 },
];

// Part of the title, so they stay with the middle. `enter` is how each one appears, `at` when (seconds).
const TITLE_MARKS: { src: string; place: CSSProperties; enter: string; at: number }[] = [
  { src: "/landing/dashes.webp", place: { left: "25.6%", top: "44.8%", width: "5.2%" }, enter: "lost-pop", at: 0.55 },
  { src: "/landing/squiggle.webp", place: { left: "44.6%", top: "57.4%", width: "18.2%" }, enter: "lost-draw", at: 0.7 },
  { src: "/landing/star.webp", place: { left: "73.2%", top: "58.6%", width: "4.6%" }, enter: "lost-pop", at: 0.85 },
];

const MOTION_CSS = `
@keyframes lost-float {
  0%, 100% { transform: translateY(0) rotate(var(--tilt, 0deg)); }
  50% { transform: translateY(-0.6cqw) rotate(calc(var(--tilt, 0deg) + 2deg)); }
}
@keyframes lost-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lost-rise { from { opacity: 0; transform: translateY(1.2rem); } to { opacity: 1; transform: none; } }
@keyframes lost-drop {
  0% { opacity: 0; transform: translateY(-1.6rem) scale(.94); }
  65% { opacity: 1; transform: translateY(.25rem) scale(1.01); }
  100% { opacity: 1; transform: none; }
}
@keyframes lost-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes lost-pop {
  0% { opacity: 0; transform: scale(.2) rotate(-40deg); }
  70% { opacity: 1; transform: scale(1.15) rotate(10deg); }
  100% { opacity: 1; transform: none; }
}
.lost-fade { animation: lost-fade .9s ease var(--in, 0s) both; }
.lost-rise { animation: lost-rise .7s cubic-bezier(.2, .8, .2, 1) var(--in, 0s) both; }
.lost-drop { animation: lost-drop .9s cubic-bezier(.2, .8, .2, 1) var(--in, 0s) both; }
.lost-draw { animation: lost-draw .8s ease-out var(--in, 0s) both; }
.lost-pop { animation: lost-pop .7s cubic-bezier(.2, .8, .2, 1) var(--in, 0s) both; }
.lost-float {
  animation: lost-fade .9s ease var(--in, 0s) both, lost-float var(--dur, 5s) ease-in-out var(--delay, 0s) infinite;
}
.lost-drift {
  transform: translate(calc(var(--p, 0) * var(--dx)), calc(var(--p, 0) * var(--dy)));
  opacity: calc(1 - var(--p, 0));
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  .lost-fade, .lost-rise, .lost-drop, .lost-draw, .lost-pop, .lost-float { animation: none; }
  .lost-drift { transform: none; opacity: 1; }
}`;

// Inline style helper for the CSS variables above.
const vars = (v: Record<string, string>) => v as CSSProperties;
const at = (seconds: number) => vars({ "--in": `${seconds}s` });

function Drifting({ src, place, drift: [dx, dy], float, tilt = 0, doodle, enterAt = 0 }: Floating & { doodle?: boolean; enterAt?: number }) {
  return (
    <div aria-hidden className="lost-drift pointer-events-none absolute select-none"
      style={{ ...place, ...vars({ "--dx": `${dx}vw`, "--dy": `${dy}vh` }) }}>
      <img src={src} alt="" draggable={false}
        className={`block w-full ${float ? "lost-float" : "lost-fade"} ${doodle ? "mix-blend-multiply" : ""}`}
        style={{
          ...vars({ "--in": `${enterAt}s`, "--dur": `${float?.[0] ?? 0}s`, "--delay": `${float?.[1] ?? 0}s`, "--tilt": `${tilt}deg` }),
          transform: float ? undefined : `rotate(${tilt}deg)`,
        }} />
    </div>
  );
}

// Scroll progress through the landscape scene, 0 at the top and 1 once the art has drifted away.
function useScrollProgress() {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const range = el.offsetHeight - window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, (window.scrollY - el.offsetTop) / range)) : 0;
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return scene;
}

const CREST_ALT = "I'm Lost crest: a confused student at a laptop under a tree";

export default function Home() {
  const scene = useScrollProgress();
  return (
    <main className="min-h-svh overflow-x-clip" style={{ background: PAPER, color: INK }}>
      <style>{MOTION_CSS}</style>

      {/* Laptop / desktop (landscape): 170% of a screen tall so there's room to scroll; the screen itself is pinned. */}
      <div ref={scene} className="relative hidden md:landscape:block" style={{ height: "170svh" }}>
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          {PHOTOS.map((d, i) => <Drifting key={i} {...d} enterAt={0.1} />)}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 @container"
            style={{ width: STAGE, height: `calc(${STAGE} * 2 / 3)` }}>
            <div className="absolute inset-x-0 flex justify-center" style={{ top: "4.5%", height: "40%" }}>
              <img src="/landing/crest.webp" alt={CREST_ALT} draggable={false} className="lost-drop h-full w-auto select-none" style={at(0)} />
            </div>
            <h1 className="absolute m-0" style={{ left: "31.1%", top: "46.6%", width: "40.4%" }}>
              <img src="/landing/title.png" alt="I'm Lost." draggable={false} className="lost-rise block w-full select-none" style={at(0.25)} />
            </h1>
            {/* after the title, so they're drawn on top of its background */}
            {TITLE_MARKS.map((m, i) => (
              <img key={i} src={m.src} alt="" aria-hidden draggable={false}
                className={`${m.enter} pointer-events-none absolute select-none mix-blend-multiply`} style={{ ...m.place, ...at(m.at) }} />
            ))}
            <p className="lost-rise absolute inset-x-0 text-center text-[1.75cqw]" style={{ top: "66.6%", ...at(0.9) }}>
              A shared slide, a quiet signal, a clearer classroom.
            </p>
            <div className="lost-rise absolute inset-x-0 flex justify-center gap-[1.3cqw]" style={{ top: "74.4%", ...at(1.05) }}>
              <Link href="/host"
                className="flex h-[6.5cqw] w-[22.8cqw] items-center justify-center rounded-[1.3cqw] bg-[#0c2b4c] text-[1.85cqw] font-medium text-white transition hover:bg-[#163d66] active:scale-[.98]">
                I&apos;m an instructor →
              </Link>
              <Link href="/join"
                className="flex h-[6.5cqw] w-[22.4cqw] items-center justify-center rounded-[1.3cqw] border-[0.12cqw] border-[#0c2b4c] text-[1.85cqw] font-medium transition hover:bg-white active:scale-[.98]">
                I&apos;m a student →
              </Link>
            </div>
            {DOODLES.map((d, i) => <Drifting key={i} {...d} doodle enterAt={1.1 + i * 0.12} />)}
          </div>
        </div>
      </div>

      {/* Phones and portrait tablets */}
      <div className="relative flex min-h-svh flex-col items-center px-4 pb-10 pt-8 text-center @container md:landscape:hidden">
        <img src="/landing/same-slide.webp" alt="" aria-hidden
          className="lost-float pointer-events-none absolute left-3 top-6 w-16 mix-blend-multiply"
          style={vars({ "--in": "1.1s", "--dur": "5.2s" })} />
        <img src="/landing/question-marks.webp" alt="" aria-hidden
          className="lost-float pointer-events-none absolute right-4 top-10 w-14 mix-blend-multiply"
          style={vars({ "--in": "1.25s", "--dur": "4.6s", "--delay": "0.8s" })} />
        <img src="/landing/crest.webp" alt={CREST_ALT} draggable={false} className="lost-drop h-56 w-auto select-none" style={at(0)} />
        <h1 className="relative mt-5 w-[86vw] max-w-sm">
          <img src="/landing/title.png" alt="I'm Lost." draggable={false} className="lost-rise block w-full select-none" style={at(0.25)} />
          <img src="/landing/star.webp" alt="" aria-hidden
            className="lost-pop pointer-events-none absolute -bottom-6 -right-3 w-8 mix-blend-multiply" style={at(0.85)} />
        </h1>
        <img src="/landing/squiggle.webp" alt="" aria-hidden
          className="lost-draw pointer-events-none ml-16 mt-1 w-40 mix-blend-multiply" style={at(0.7)} />
        <p className="lost-rise mt-5 max-w-xs text-base" style={at(0.9)}>A shared slide, a quiet signal, a clearer classroom.</p>
        <div className="lost-rise mt-7 flex w-full max-w-sm flex-col gap-3" style={at(1.05)}>
          <Link href="/host" className="rounded-2xl bg-[#0c2b4c] px-6 py-4 text-lg font-medium text-white transition active:scale-[.98]">
            I&apos;m an instructor →
          </Link>
          <Link href="/join" className="rounded-2xl border-2 border-[#0c2b4c] px-6 py-4 text-lg font-medium transition active:scale-[.98]">
            I&apos;m a student →
          </Link>
        </div>
        <img src="/landing/im-lost-note.webp" alt="" aria-hidden
          className="lost-float pointer-events-none mt-8 w-24 self-end mix-blend-multiply"
          style={vars({ "--in": "1.4s", "--dur": "6s", "--delay": "0.4s" })} />
      </div>
    </main>
  );
}
