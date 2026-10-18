"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { forgetClass, getMyClasses, type MyClass } from "./myClasses";

// "Your classes on this device" with a Resume link each. Renders nothing if there are none.
export function MyClassesList() {
  const [classes, setClasses] = useState<MyClass[]>([]);
  useEffect(() => setClasses(getMyClasses()), []);
  if (!classes.length) return null;

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-bold">Your classes on this device</h2>
      <p className="text-sm text-gray-600">Closed the tab? Pick up where you left off.</p>
      <ul className="mt-4 divide-y">
        {classes.map(c => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-bold">{c.title}</p>
              <p className="text-sm text-gray-600">
                Code <span className="font-mono font-bold">{c.code}</span> · opened {new Date(c.lastOpened).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm text-gray-500 underline"
                onClick={() => { forgetClass(c.id); setClasses(getMyClasses()); }}>Remove</button>
              <Link href={`/host/${c.id}`} className="rounded-xl bg-[#0c2b4c] px-4 py-2 font-bold text-white">Resume</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
