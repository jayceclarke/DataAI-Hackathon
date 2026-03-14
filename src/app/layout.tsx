import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "./navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "CatchUp | Duolingo-style AI for Classes",
  description:
    "Duolingo-style AI system that turns class materials into short daily lessons so students can realistically catch up after falling behind."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="gradient-bg min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BackButton />
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-xl font-black text-slate-950 shadow-lg shadow-brand-500/40">
                  C
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold uppercase tracking-wider text-brand-200">
                    CatchUp
                  </div>
                  <p className="text-xs text-slate-400">
                    Turn missed classes into tiny wins
                  </p>
                </div>
              </Link>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-6 text-center text-xs text-slate-500">
            Built for catching up, not burning out.
          </footer>
        </div>
      </body>
    </html>
  );
}

