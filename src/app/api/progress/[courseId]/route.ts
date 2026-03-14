import { unstable_noStore } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseClient";
import { recomputeCourseProgress } from "@/lib/progress";

const ParamsSchema = z.object({
  courseId: z.string().uuid()
});

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { courseId: string } }
) {
  unstable_noStore();
  request.headers.get("x-requested-with");
  const parsed = ParamsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const userId = "demo-user";

    const { data: progress } = await supabase
      .from("user_course_progress")
      .select(
        "concepts_completed, total_concepts, total_xp, current_streak, last_activity_date"
      )
      .eq("user_id", userId)
      .eq("course_id", parsed.data.courseId)
      .maybeSingle();

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title, course_code")
      .eq("id", parsed.data.courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const { data: conceptsRows } = await supabase
      .from("concepts")
      .select("id, title, summary, difficulty, estimated_minutes, order_index")
      .eq("course_id", parsed.data.courseId)
      .order("order_index", { ascending: true });

    const { data: lessonsRows } = await supabase
      .from("lessons")
      .select("id, concept_id")
      .eq("course_id", parsed.data.courseId);

    const { data: sessionRows } = await supabase
      .from("session_attempts")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", parsed.data.courseId);

    const sessionIds = (sessionRows ?? []).map(s => s.id);

    let completedLessonIds = new Set<string>();
    if (sessionIds.length > 0) {
      const { data: attemptRows } = await supabase
        .from("lesson_attempts")
        .select("lesson_id")
        .in("session_attempt_id", sessionIds)
        .eq("is_correct", true);
      completedLessonIds = new Set(
        (attemptRows ?? []).map(a => a.lesson_id as string)
      );
    }

    const lessonByConceptId = new Map<string, string>();
    (lessonsRows ?? []).forEach(l => {
      lessonByConceptId.set(l.concept_id as string, l.id as string);
    });

    const concepts = (conceptsRows ?? []).map(c => {
      const lessonId = lessonByConceptId.get(c.id as string) ?? "";
      return {
        id: c.id,
        title: c.title,
        summary: c.summary,
        difficulty: c.difficulty,
        estimated_minutes: c.estimated_minutes,
        order_index: c.order_index,
        completed: completedLessonIds.has(lessonId)
      };
    });

    const { conceptsCompleted, totalConcepts, totalXp } =
      await recomputeCourseProgress(parsed.data.courseId);
    const percentCaughtUp =
      totalConcepts > 0
        ? Math.round((conceptsCompleted / totalConcepts) * 100)
        : 0;

    const { data: allAttempts } = await supabase
      .from("lesson_attempts")
      .select("is_correct")
      .in("session_attempt_id", sessionIds);
    const totalAttempts = allAttempts?.length ?? 0;
    const correctCount =
      allAttempts?.filter(a => a.is_correct === true).length ?? 0;
    const quizAccuracy =
      totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    return NextResponse.json(
      {
        title: course.title,
        course_code: course.course_code,
        concepts_completed: conceptsCompleted,
        total_concepts: totalConcepts,
        percent_caught_up: percentCaughtUp,
        total_xp: totalXp,
        current_streak: progress?.current_streak ?? 0,
        last_activity_date: progress?.last_activity_date ?? null,
        quiz_accuracy: quizAccuracy,
        concepts
      },
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
      { error: "Failed to load progress" },
      { status: 500 }
    );
  }
}

