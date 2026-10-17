import "./globals.css";
export const metadata = { title: "LOST — Classroom clarity", description: "Make classroom confusion visible" };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
