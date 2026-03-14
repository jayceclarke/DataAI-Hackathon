import Link from "next/link";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

async function loadCourses() {
  const supabase = supabaseBrowserClient();
  const userId = "demo-user";

  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      id,
      title,
      course_code,
      user_course_progress (
        concepts_completed,
        total_concepts,
        total_xp,
        current_streak
      )
    `
    )
    .eq("user_id", userId);

  if (error || !data) return [];

  return data.map(row => {
    const progress = (row as any).user_course_progress?.[0];
    const completed = progress?.concepts_completed ?? 0;
    const total = progress?.total_concepts ?? 0;
    const percent =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      id: row.id as string,
      title: row.title as string,
      courseCode: (row.course_code as string) ?? "",
      streak: progress?.current_streak ?? 0,
      xp: progress?.total_xp ?? 0,
      completed,
      total,
      percent
    };
  });
}

export default async function DashboardPage() {
  const courses = await loadCourses();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            Your courses
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            See where you&apos;re behind and jump into a tiny catch-up
            session.
          </p>
        </div>
        <Link
          href="/courses/new"
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
        >
          New course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300 ring-1 ring-slate-800/80">
          No courses yet. Create one to start turning missed lectures into
          daily sessions.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map(course => (
            <div
              key={course.id}
              className="flex flex-col justify-between rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80"
            >
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-50">
                  {course.title}
                </h2>
                {course.courseCode && (
                  <p className="text-xs text-slate-400">
                    {course.courseCode}
                  </p>
                )}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${course.percent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  {course.completed}/{course.total || "?"} concepts completed
                  {course.total === 0 && " (generate lessons to start)"}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                <div className="space-y-0.5">
                  <p>
                    <span className="font-semibold">{course.streak}</span> day
                    streak
                  </p>
                  <p>
                    <span className="font-semibold">{course.xp}</span> XP
                  </p>
                </div>
                <Link
                  href={`/courses/${course.id}/session`}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow shadow-brand-500/40 hover:bg-brand-400"
                >
                  Start today&apos;s session
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

