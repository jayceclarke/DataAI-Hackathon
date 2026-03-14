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
        setFetchError(json?.error ?? "Couldn't load courses. Click Refresh to try again.");
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
        setFetchError("Couldn't load courses. Click Refresh to try again.");
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
            See where you&apos;re behind and jump into a tiny catch-up
            session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadCourses(true)}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
          >
            Refresh
          </button>
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
        <div className="rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300 ring-1 ring-slate-800/80">
          Loading your courses…
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300 ring-1 ring-slate-800/80">
          No courses yet. Create one to start turning missed lectures into daily
          sessions.
        </div>
      ) : (
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
      )}
    </div>
  );
}

