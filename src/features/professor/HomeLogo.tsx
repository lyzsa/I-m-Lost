import Link from "next/link";

// Top-corner logo. Clicking it goes back to the landing page.
export function HomeLogo() {
  return (
    <Link href="/" aria-label="LOST home" className="inline-flex items-center gap-2 font-bold tracking-widest text-emerald-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-900 text-lg text-white">?</span>
      LOST
    </Link>
  );
}
