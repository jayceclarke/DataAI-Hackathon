"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ConceptItem = {
  id: string;
  title: string;
  summary: string;
  difficulty: string;
  estimated_minutes: number;
  order_index: number;
  completed: boolean;
  source_document_id?: string | null;
};

type Section = {
  label: string;
  source_document_id: string | null;
  concepts: ConceptItem[];
};

type ProgressData = {
  title: string;
  course_code: string | null;
  concepts_completed: number;
  total_concepts: number;
  percent_caught_up: number;
  total_xp: number;
  current_streak: number;
  last_activity_date: string | null;
  quiz_accuracy: number;
  concepts: ConceptItem[];
  sections?: Section[];
};

export default function CourseProgressPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const courseId = params.courseId as string;
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const loadProgress = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/progress/${courseId}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache" }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load progress");
        return res.json();
      })
      .then((json: ProgressData) => {
        setData(json);
        if (json.sections && json.sections.length > 0) {
          const firstKey = json.sections[0].source_document_id ?? "section-0";
          setExpandedSections(new Set([firstKey]));
        }
      })
      .catch(() => {
        setError("Couldn't load progress for this course.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress, pathname]);

  useEffect(() => {
    const onFocus = () => loadProgress();
    const onVisible = () => loadProgress();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) loadProgress();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [loadProgress]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-300">Loading progress…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-rose-400">{error ?? "Couldn't load progress."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800/80"
            >
              ← Back to dashboard
            </button>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-50">
            {data.title}
          </h1>
          {data.course_code && (
            <p className="text-xs text-slate-400">{data.course_code}</p>
          )}
          <p className="mt-1 text-sm text-slate-300">
            Progress and concepts — study any concept or run a mixed session.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/courses/${courseId}/session`}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
          >
            Start today&apos;s session
          </Link>
          <Link
            href={`/courses/${courseId}/upload?supplement=1`}
            className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700/80"
          >
            Add material
          </Link>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Caught up
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${data.percent_caught_up}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {data.concepts_completed}/{data.total_concepts} concepts completed
            · {data.percent_caught_up}% caught up
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
          <div>
            <p className="text-xs text-slate-400">Total XP</p>
            <p className="mt-0.5 text-lg font-semibold">{data.total_xp}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Current streak</p>
            <p className="mt-0.5 text-lg font-semibold">
              {data.current_streak} days
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Quiz accuracy</p>
            <p className="mt-0.5 text-lg font-semibold">
              {data.quiz_accuracy}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Last activity</p>
            <p className="mt-0.5 text-lg font-semibold">
              {data.last_activity_date ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-200">
          Concepts
        </h2>
        {!data.concepts?.length ? (
          <div className="rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300 ring-1 ring-slate-800/80">
            No concepts yet. Upload material and generate lessons for this
            course.
          </div>
        ) : (data.sections && data.sections.length > 0 ? (
          <div className="space-y-2">
            {data.sections.map((section, idx) => {
              const sectionKey = section.source_document_id ?? `section-${idx}`;
              const isExpanded = expandedSections.has(sectionKey);
              const completedCount = section.concepts.filter(c => c.completed).length;
              return (
                <div
                  key={sectionKey}
                  className="rounded-2xl bg-slate-950/70 ring-1 ring-slate-800/80 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedSections(prev => {
                        const next = new Set(prev);
                        if (next.has(sectionKey)) next.delete(sectionKey);
                        else next.add(sectionKey);
                        return next;
                      });
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {section.label}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      <span>
                        {completedCount}/{section.concepts.length} done
                      </span>
                      <svg
                        className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 space-y-3 px-4 pb-4 pt-3">
                      {section.concepts.map(concept => (
                        <div
                          key={concept.id}
                          className="flex flex-col gap-3 rounded-xl bg-slate-900/70 p-4 ring-1 ring-slate-800/80 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-50">
                                {concept.title}
                              </h3>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  concept.completed
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-slate-700/80 text-slate-400"
                                }`}
                              >
                                {concept.completed ? "Done" : "Not done"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-300">
                              {concept.summary}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {concept.estimated_minutes} min ·{" "}
                              <span className="capitalize">{concept.difficulty}</span>
                            </p>
                          </div>
                          <Link
                            href={`/courses/${courseId}/session?conceptId=${concept.id}`}
                            className="shrink-0 self-start rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-700/80 hover:bg-slate-700/80"
                          >
                            Study this concept
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {data.concepts.map(concept => (
              <div
                key={concept.id}
                className="flex flex-col gap-3 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-50">
                      {concept.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        concept.completed
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-700/80 text-slate-400"
                      }`}
                    >
                      {concept.completed ? "Done" : "Not done"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {concept.summary}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {concept.estimated_minutes} min ·{" "}
                    <span className="capitalize">{concept.difficulty}</span>
                  </p>
                </div>
                <Link
                  href={`/courses/${courseId}/session?conceptId=${concept.id}`}
                  className="shrink-0 self-start rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-700/80 hover:bg-slate-700/80"
                >
                  Study this concept
                </Link>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
