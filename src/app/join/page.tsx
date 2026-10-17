// Student join page (PLAN.md step B1). Owner: Person B.
// JoinForm reads ?code= from the URL, so Next.js needs it inside <Suspense> for `npm run build`.
import Link from "next/link";
import { Suspense } from "react";
import JoinForm from "@/features/student/JoinForm";

export default function Page() {
  return (
    <main className="mx-auto max-w-md p-4 pt-12">
      <Link href="/" className="text-2xl font-bold">LOST</Link>
      <h1 className="mt-6 mb-2 text-3xl font-bold">Join your class</h1>
      <p className="mb-6 text-gray-600">Type the code on the professor&apos;s screen.</p>
      <Suspense fallback={<p className="rounded-2xl bg-white p-5 text-gray-500">Loading...</p>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
