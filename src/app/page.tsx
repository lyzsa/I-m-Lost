import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl p-8 pt-24">
      <p className="text-sm font-bold tracking-widest text-emerald-700">LOST / CLASSROOM CLARITY</p>
      <h1 className="my-6 text-6xl font-bold">Make confusion<br />visible.</h1>
      <p className="mb-10 max-w-xl text-xl">A shared slide, a quiet signal, a clearer classroom.</p>
      <div className="flex flex-wrap gap-4">
        <Link className="rounded-xl bg-emerald-900 px-6 py-4 text-lg text-white" href="/host">I&apos;m the professor →</Link>
        <Link className="rounded-xl border-2 border-emerald-900 bg-white px-6 py-4 text-lg text-emerald-900" href="/join">I&apos;m a student →</Link>
      </div>
    </main>
  );
}
