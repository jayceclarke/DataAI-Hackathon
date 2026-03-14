"use client";

import { usePathname, useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Hide on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-200 shadow-sm shadow-slate-900/40 hover:border-slate-500 hover:bg-slate-900 transition"
      aria-label="Go back"
    >
      <span className="text-sm">←</span>
    </button>
  );
}

