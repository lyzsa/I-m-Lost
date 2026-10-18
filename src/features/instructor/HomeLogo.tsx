import Image from "next/image";
import Link from "next/link";

// Top-corner logo: the landing page's crest and the LOST name in navy ink, same as the student screens' CrestLogo.
// Clicking it goes back to the landing page.
export function HomeLogo() {
  return (
    <Link href="/" aria-label="LOST home" className="inline-flex shrink-0 items-center gap-2 font-bold tracking-widest text-[#0c2b4c]">
      <Image src="/landing/crest.webp" alt="" width={544} height={900} priority className="h-10 w-auto select-none" draggable={false} />
      LOST
    </Link>
  );
}
