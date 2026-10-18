/* eslint-disable @next/next/no-img-element -- the same transparent crest the landing page uses (public/landing) */
import Link from "next/link";

// Top-corner logo on the student screens: the landing page's crest and the app name LOST, big and extra bold in navy.
// Clicking it goes back to the landing page.
export function CrestLogo() {
  return (
    <Link href="/" aria-label="LOST home" className="inline-flex shrink-0 items-center gap-2 text-xl font-black text-[#0c2b4c] md:text-2xl">
      <img src="/landing/crest.webp" alt="" draggable={false} className="h-10 w-auto select-none" />
      LOST
    </Link>
  );
}
