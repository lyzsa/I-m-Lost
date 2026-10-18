/* eslint-disable @next/next/no-img-element -- the same transparent crest the landing page uses (public/landing) */
import Link from "next/link";

// Top-corner logo on the student screens: the landing page's crest and the LOST name, in its navy ink.
// Clicking it goes back to the landing page.
export function CrestLogo() {
  return (
    <Link href="/" aria-label="LOST home" className="inline-flex shrink-0 items-center gap-2 font-bold tracking-widest text-[#0c2b4c]">
      <img src="/landing/crest.webp" alt="" draggable={false} className="h-10 w-auto select-none" />
      LOST
    </Link>
  );
}
