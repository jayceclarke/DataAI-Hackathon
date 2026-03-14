import { supabaseBrowserClient } from "@/lib/supabaseClient";

async function loadProgress(courseId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/progress/${courseId}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    concepts_completed: number;
    total_concepts: number;
    percent_caught_up: number;
    total_xp: number;
    current_streak: number;
    last_activity_date: string | null;
    quiz_accuracy: number;
  };
}

async function loadCourseTitle(courseId: string) {
  const supabase = supabaseBrowserClient();
  const { data, error } = await supabase
    .from("courses")
    .select("title, course_code")
    .eq("id", courseId)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function CourseProgressPage({
  params
}: {
  params: { courseId: string };
}) {
  const [progress, course] = await Promise.all([
    loadProgress(params.courseId),
    loadCourseTitle(params.courseId)
  ]);

  if (!progress || !course) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-rose-400">
          Couldn't load progress for this course.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          {course.title}
        </h1>
        {course.course_code && (
          <p className="text-xs text-slate-400">{course.course_code}</p>
        )}
        <p className="mt-1 text-sm text-slate-300">
          Big-picture view of how caught up you are.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Caught up
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${progress.percent_caught_up}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {progress.concepts_completed}/{progress.total_concepts} concepts
            completed · {progress.percent_caught_up}% caught up
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
          <div>
            <p className="text-xs text-slate-400">Total XP</p>
            <p className="mt-0.5 text-lg font-semibold">
              {progress.total_xp}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Current streak</p>
            <p className="mt-0.5 text-lg font-semibold">
              {progress.current_streak} days
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Quiz accuracy</p>
            <p className="mt-0.5 text-lg font-semibold">
              {progress.quiz_accuracy}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Last activity</p>
            <p className="mt-0.5 text-lg font-semibold">
              {progress.last_activity_date ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

