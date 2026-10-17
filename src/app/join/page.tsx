// Student join page (PLAN.md step B1). Owner: Person B.
// JoinForm reads ?code= from the URL, so Next.js needs it inside <Suspense> for `npm run build`.
import Link from "next/link";
import { Suspense } from "react";
import JoinForm from "@/features/student/JoinForm";
import { LostChick } from "@/features/student/LostChick";

// Rounded, friendly system fonts; falls back to the app font if none is installed.
const roundFont = { fontFamily: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Nunito, "Arial Rounded MT Bold", Arial, sans-serif' };

export default function Page() {
  return (
    <div style={roundFont} className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-sky-100">
      {/* big faded question marks drifting in the background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none font-bold text-amber-300/30">
        <span className="absolute top-10 left-4 rotate-[-15deg] text-7xl">?</span>
        <span className="absolute top-1/3 right-3 rotate-12 text-8xl">?</span>
        <span className="absolute bottom-16 left-8 rotate-6 text-6xl">?</span>
      </div>

      <main className="relative mx-auto max-w-md px-4 pt-6 pb-12">
        <Link href="/" className="text-2xl font-black tracking-wide text-amber-900">LOST<span className="text-orange-400">?</span></Link>
        <Suspense fallback={<LostChick className="mx-auto mt-16 h-48 w-48" />}>
          <JoinForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-amber-800/70">The code is on your professor&apos;s screen. We&apos;ll find your class together 🐥</p>
      </main>
    </div>
  );
}
