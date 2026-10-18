// Student class pages (live screen and My Review). Owner: Person B.
// Warm off-white page background for the student screens (the shared default in globals.css is grey-green).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#faf9f7]">{children}</div>;
}
