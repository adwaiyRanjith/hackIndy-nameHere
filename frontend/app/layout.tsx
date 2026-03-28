import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PASSLINE — ADA Compliance Audit",
  description: "Record your building, get a professional ADA compliance report.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <nav className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
            <span className="rounded bg-blue-700 px-2 py-0.5 text-white text-sm font-black tracking-wide">
              PASS
            </span>
            <span className="text-slate-800">LINE</span>
          </a>
          <span className="text-slate-400 text-sm ml-2">ADA Compliance Audit</span>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
