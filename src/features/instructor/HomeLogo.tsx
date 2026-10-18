import Image from "next/image";
import Link from "next/link";

// Top-corner logo: the landing page's crest and the app name LOST, big and bold in navy, same as the student CrestLogo.
// Clicking it goes back to the landing page.
export function HomeLogo() {
  return (
    <Link href="/" aria-label="LOST home" className="inline-flex shrink-0 items-center gap-2 text-xl font-bold text-[#0c2b4c] md:text-2xl">
      <Image src="/landing/crest.webp" alt="" width={544} height={900} priority className="h-10 w-auto select-none" draggable={false} />
      LOST
    </Link>
  );
}
