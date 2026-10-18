import Image from "next/image";
import Link from "next/link";

// Top-corner logo (the I'M LOST crest, public/logo.png). Clicking it goes back to the landing page.
export function HomeLogo() {
  return (
    <Link href="/" aria-label="LOST home" className="inline-flex items-center gap-2 font-bold tracking-widest text-emerald-900">
      <Image src="/logo.png" alt="" width={286} height={480} priority className="h-12 w-auto" />
      LOST
    </Link>
  );
}
