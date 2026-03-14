"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!materialTitle || !rawText) {
      setError("Please add a material title and some text.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: courseTitle || materialTitle,
          materialTitle,
          rawText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        setIsLoading(false);
        return;
      }

      router.push(`/session?courseId=${data.courseId}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Failed to upload material.");
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          Turn class notes into micro-lessons
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Start with one lecture: paste the slides or notes. We'll turn it
          into a short daily session.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Course title
            </label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="e.g. Distributed Systems"
              value={courseTitle}
              onChange={event => setCourseTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Material title
            </label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder="e.g. Lecture 7 – Cache Coherence"
              value={materialTitle}
              onChange={event => setMaterialTitle(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Paste slides or notes
          </label>
          <textarea
            className="h-56 w-full resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="Paste the content from slides, notes, or textbook here..."
            value={rawText}
            onChange={event => setRawText(event.target.value)}
          />
          <p className="text-xs text-slate-500">
            We'll extract key concepts and create a handful of 2–5 minute
            lessons.
          </p>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-400">{error}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Generating micro-lessons…" : "Generate micro-lessons"}
          </button>
          <p className="text-xs text-slate-500">
            First time? Try a single lecture instead of a whole course.
          </p>
        </div>
      </form>
    </div>
  );
}

