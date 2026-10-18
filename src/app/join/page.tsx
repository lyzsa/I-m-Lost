/* eslint-disable @next/next/no-img-element -- fixed decorative art from public/landing, like the landing page */
// Student join page (docs/build-plan.md step B1). Owner: Person B.
// Same look as the landing page: navy ink, the crest and a hand-drawn doodle, on the student screens' warm off-white.
// JoinForm reads ?code= from the URL, so Next.js needs it inside <Suspense> for `npm run build`.
import Link from "next/link";
import { Suspense } from "react";
import JoinForm from "@/features/student/JoinForm";

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-x-clip bg-[#faf9f7] text-[#0c2b4c]">
      <img src="/landing/question-marks.webp" alt="" aria-hidden draggable={false}
        className="pointer-events-none absolute right-4 top-6 w-16 select-none mix-blend-multiply md:right-16 md:w-24" />
      <div className="mx-auto max-w-md px-4 pb-10 pt-8">
        <Link href="/" aria-label="LOST home" className="mx-auto block w-fit">
          <img src="/landing/crest.webp" alt="I'm Lost crest" draggable={false} className="h-32 w-auto select-none" />
        </Link>
        <h1 className="mt-4 text-center text-3xl font-bold">Join your class</h1>
        <p className="mb-6 mt-1 text-center text-gray-600">Type the code on the instructor&apos;s screen.</p>
        <Suspense fallback={<p className="rounded-2xl bg-white p-5 text-gray-500">Loading...</p>}>
          <JoinForm />
        </Suspense>
      </div>
    </main>
  );
}
