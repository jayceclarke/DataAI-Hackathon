"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseCard } from "@/components/CourseCard";

type DashboardCourse = {
  id: string;
  title: string;
  courseCode: string;
  streak: number;
  xp: number;
  completed: number;
  total: number;
  percent: number;
};

export default function DashboardPage() {
  const pathname = usePathname();
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const loadIdRef = useRef(0);

  const loadCourses = useCallback(async (force = false) => {
    if (!force && loadingRef.current) return;
    loadingRef.current = true;
    loadIdRef.current += 1;
    const thisLoadId = loadIdRef.current;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
        cache: "no-store"
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFetchError(json?.error ?? "Couldn't load courses.");
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json.courses) ? json.courses : [];
      if (thisLoadId === loadIdRef.current) {
        setCourses(list);
      }
    } catch {
      if (thisLoadId === loadIdRef.current) {
        setFetchError("Couldn't load courses.");
      }
    } finally {
      if (thisLoadId === loadIdRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  }, []);

  // Refetch when we're on dashboard (e.g. after creating a course and navigating back)
  useEffect(() => {
    if (pathname === "/dashboard") {
      loadCourses(true);
    }
  }, [loadCourses, pathname]);

  // Refetch when user returns to this tab so new courses from other tabs or fresh DB show up
  useEffect(() => {
    const onFocus = () => {
      if (pathname === "/dashboard") {
        loadCourses(true);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [pathname, loadCourses]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            Your courses
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            See where you're behind and jump into a tiny catch-up
            session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/courses/new"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
          >
            New course
          </Link>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-200 ring-1 ring-amber-500/30">
          {fetchError}
        </div>
      )}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80 animate-pulse"
            >
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-700/80" />
                <div className="h-3 w-1/3 rounded bg-slate-800/80" />
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-800/80" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-slate-800" />
                  <div className="h-6 w-12 rounded-full bg-slate-800" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 rounded-lg bg-slate-800" />
                  <div className="h-8 w-24 rounded-lg bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-slate-950/70 p-8 text-center ring-1 ring-slate-800/80">
          <h2 className="text-lg font-semibold text-slate-50">
            No courses yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Create your first course, upload slides or notes, and turn them into
            bite-sized daily sessions so you can catch up without burning out.
          </p>
          <Link
            href="/courses/new"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
          >
            Create your first course
          </Link>
          <Link
            href="/"
            className="mt-3 text-xs text-slate-500 hover:text-slate-400"
          >
            How it works
          </Link>
        </div>
      ) : (
        <>
          {(() => {
            const incomplete = courses.filter(c => c.total > 0 && c.percent < 100);
            const suggested = incomplete.length > 0
              ? incomplete.sort((a, b) => a.percent - b.percent)[0]
              : courses[0];
            const isCaughtUp = incomplete.length === 0 && courses.some(c => c.total > 0);
            return suggested ? (
              <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 px-4 py-4 ring-1 ring-brand-500/20">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-300/90">
                  {isCaughtUp ? "Stay sharp" : "Today's goal"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {isCaughtUp
                    ? `Review ${suggested.title}`
                    : `Get closer in ${suggested.title}`}
                </p>
                {!isCaughtUp && suggested.total > 0 && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {suggested.completed}/{suggested.total} concepts · {100 - suggested.percent}% to go
                  </p>
                )}
                <Link
                  href={`/courses/${suggested.id}/session`}
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
                >
                  {isCaughtUp ? "Start review session" : "Continue"}
                </Link>
              </div>
            ) : null;
          })()}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-950/70 px-4 py-3 ring-1 ring-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total XP
              </span>
              <span className="text-lg font-bold text-brand-300">
                {courses.reduce((sum, c) => sum + c.xp, 0).toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Best streak
              </span>
              <span className="text-lg font-bold text-amber-400">
                {Math.max(0, ...courses.map(c => c.streak))} days
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Caught up
              </span>
              <span className="text-lg font-bold text-emerald-400">
                {courses.filter(c => c.total > 0 && c.percent === 100).length} / {courses.length}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map(course => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              courseCode={course.courseCode}
              streak={course.streak}
              xp={course.xp}
              completed={course.completed}
              total={course.total}
              percent={course.percent}
              onDeleted={handleDeleted}
            />
          ))}
          </div>
        </>
      )}
    </div>
  );
}

