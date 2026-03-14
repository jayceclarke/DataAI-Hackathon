import { unstable_noStore } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";
import { recomputeCourseProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

export async function GET() {
  unstable_noStore();
  const auth = await getAuthUserAndSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  try {
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, title, course_code, is_public")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(500);

    if (coursesError) {
      // eslint-disable-next-line no-console
      console.error("Dashboard: courses query failed", coursesError);
      return NextResponse.json(
        {
          error: "Failed to load courses",
          details: process.env.NODE_ENV === "development" ? coursesError.message : undefined
        },
        { status: 500 }
      );
    }

    const courseList = courses ?? [];

    const { data: progressRows } = await supabase
      .from("user_course_progress")
      .select("course_id, current_streak")
      .eq("user_id", user.id);

    const streakByCourse = new Map<string, number>();
    (progressRows ?? []).forEach(p => {
      streakByCourse.set(p.course_id as string, (p.current_streak as number) ?? 0);
    });

    const result = await Promise.all(
      courseList.map(
        async (c: { id: string; title: string; course_code: string | null; is_public?: boolean }) => {
          let conceptsCompleted = 0;
          let totalConcepts = 0;
          let totalXp = 0;
          try {
            const progress = await recomputeCourseProgress(c.id, user.id);
            conceptsCompleted = progress.conceptsCompleted;
            totalConcepts = progress.totalConcepts;
            totalXp = progress.totalXp;
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Dashboard: recomputeCourseProgress failed for course", c.id, err);
          }
          const percent =
            totalConcepts > 0
              ? Math.round((conceptsCompleted / totalConcepts) * 100)
              : 0;
          return {
            id: c.id,
            title: c.title,
            courseCode: c.course_code ?? "",
            completed: conceptsCompleted,
            total: totalConcepts,
            percent,
            xp: totalXp,
            streak: streakByCourse.get(c.id) ?? 0,
            isPublic: c.is_public ?? false
          };
        }
      )
    );

    return NextResponse.json(
      { courses: result },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0"
        }
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
