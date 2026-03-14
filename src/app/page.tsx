import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <section className="max-w-2xl space-y-4">
        <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700/60 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Duolingo-style daily catch-up for real classes
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
          Fell behind in class? Turn slides into{" "}
          <span className="bg-gradient-to-r from-brand-300 via-emerald-300 to-brand-300 bg-clip-text text-transparent">
            5-minute wins
          </span>
          .
        </h1>
        <p className="text-pretty text-sm text-slate-300 sm:text-base">
          Upload your syllabus, slides, or notes. CatchUp uses AI to carve them
          into tiny concepts, explains each in 1–2 sentences, and drills you
          with quick questions so you can realistically get back on track.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400"
          >
            Start with a course
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-100 ring-1 ring-slate-700/80 transition hover:bg-slate-800/80"
          >
            View my progress
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/80">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Micro-lessons
          </h2>
          <p className="text-xs text-slate-300">
            Every upload becomes bite-sized concepts with an explanation,
            concrete example, and a quick check question.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/80">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Daily sessions
          </h2>
          <p className="text-xs text-slate-300">
            Catch up in 5–10 minutes a day. The session builder serves just a
            few unfinished concepts at a time.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/80">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Streak & XP
          </h2>
          <p className="text-xs text-slate-300">
            Earn XP for each concept, maintain streaks, and see how close you
            are to fully “caught up” for a course.
          </p>
        </div>
      </section>
    </div>
  );
}

