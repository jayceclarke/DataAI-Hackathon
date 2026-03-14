"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PublicCourse = {
  id: string;
  title: string;
  course_code: string;
  concept_count: number;
};

export default function DiscoverPage() {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (search) params.set("q", search);
      const res = await fetch(`/api/courses/public?${params}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.details === "string" ? data.details : data?.error ?? "Failed to load";
        setFetchError(msg);
        setCourses([]);
        return;
      }
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Request failed");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const handleAdd = async (sourceId: string) => {
    if (addingId) return;
    setAddingId(sourceId);
    setAddError(null);
    try {
      const res = await fetch("/api/courses/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_course_id: sourceId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.course_id) {
        window.location.assign(`/courses/${data.course_id}/progress`);
        return;
      }
      setAddError((data?.error as string) || "Failed to add course");
      setAddingId(null);
    } catch {
      setAddError("Request failed");
      setAddingId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          Discover courses
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Browse material others have shared. Add any course to your list and
          study at your own pace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search by title or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/80 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/80"
        >
          Back to dashboard
        </Link>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-200 ring-1 ring-amber-500/30">
          {fetchError}
        </div>
      )}
      {addError && (
        <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-200 ring-1 ring-rose-500/30">
          {addError}
        </div>
      )}
      {loading ? (
        <div className="rounded-2xl bg-slate-950/70 p-8 text-center text-sm text-slate-400 ring-1 ring-slate-800/80">
          Loading...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl bg-slate-950/70 p-8 text-center ring-1 ring-slate-800/80">
          <p className="text-sm text-slate-400">
            {fetchError ? "Could not load public courses." : "No public courses yet. Share one of your courses from its progress page to add it here."}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-xs font-medium text-brand-300 hover:text-brand-200"
          >
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map(c => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  {c.title}
                </h2>
                {c.course_code && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {c.course_code}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {c.concept_count} concepts
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAdd(c.id)}
                disabled={addingId !== null}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400 disabled:opacity-50"
              >
                {addingId === c.id ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-950" />
                    Copying course...
                  </>
                ) : (
                  "Add to my courses"
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
