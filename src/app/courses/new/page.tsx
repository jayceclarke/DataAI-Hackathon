"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title) {
      setError("Course title is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          course_code: courseCode || undefined,
          daily_goal_minutes: dailyMinutes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to create course.");
        setLoading(false);
        return;
      }

      router.push(`/courses/${data.course_id}/upload`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Failed to create course.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          Create a course
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Give CatchUp a container for your missed lectures. You&apos;ll upload
          slides or notes next.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Course name
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="e.g. Distributed Systems"
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Course code (optional)
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="e.g. EECS 570"
            value={courseCode}
            onChange={event => setCourseCode(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Daily goal (minutes)
          </label>
          <input
            type="number"
            min={5}
            max={60}
            className="w-28 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            value={dailyMinutes}
            onChange={event =>
              setDailyMinutes(Number.parseInt(event.target.value, 10) || 10)
            }
          />
          <p className="text-xs text-slate-500">
            We&apos;ll build sessions that roughly fit this time.
          </p>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-400">{error}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create course"}
          </button>
        </div>
      </form>
    </div>
  );
}

