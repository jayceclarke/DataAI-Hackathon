"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  id: string;
  title: string;
  courseCode: string;
  streak: number;
  xp: number;
  completed: number;
  total: number;
  percent: number;
  onDeleted?: (id: string) => void;
  onDeleteStarted?: () => void;
};

export function CourseCard({
  id,
  title,
  courseCode,
  streak,
  xp,
  completed,
  total,
  percent,
  onDeleted,
  onDeleteStarted
}: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    const confirmed = window.confirm(
      "Delete this course and its generated lessons? This cannot be undone."
    );
    if (!confirmed) return;

    onDeleteStarted?.();
    setDeleting(true);
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: "DELETE"
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = json?.details ?? json?.error ?? "Failed to delete course.";
        // eslint-disable-next-line no-alert
        alert(msg);
        setDeleting(false);
        return;
      }
      if (onDeleted) {
        onDeleted(id);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // eslint-disable-next-line no-alert
      alert("Failed to delete course.");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
            {courseCode && (
              <p className="text-xs text-slate-400">{courseCode}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] font-medium text-slate-500 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Remove"}
          </button>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-brand-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">
          {completed}/{total || "?"} concepts completed
          {total === 0 && " (generate lessons to start)"}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
        <div className="space-y-0.5">
          <p>
            <span className="font-semibold">{streak}</span> day streak
          </p>
          <p>
            <span className="font-semibold">{xp}</span> XP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${id}/progress`}
            className="rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 ring-1 ring-slate-700/80 hover:bg-slate-800/80"
          >
            Progress
          </Link>
          <Link
            href={`/courses/${id}/session`}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow shadow-brand-500/40 hover:bg-brand-400"
          >
            Start session
          </Link>
        </div>
      </div>
    </div>
  );
}

