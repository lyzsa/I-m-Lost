// Student join page (docs/build-plan.md step B1). Owner: Person B.
// JoinForm reads ?code= from the URL, so Next.js needs it inside <Suspense> for `npm run build`.
import { Suspense } from "react";
import JoinForm from "@/features/student/JoinForm";
import { HomeLogo } from "@/features/professor/HomeLogo"; // shared with the professor screens so the logo matches

export default function Page() {
  return (
    <main className="mx-auto max-w-md p-4 pt-12">
      <HomeLogo />
      <h1 className="mt-6 mb-2 text-3xl font-bold">Join your class</h1>
      <p className="mb-6 text-gray-600">Type the code on the professor&apos;s screen.</p>
      <Suspense fallback={<p className="rounded-2xl bg-white p-5 text-gray-500">Loading...</p>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
