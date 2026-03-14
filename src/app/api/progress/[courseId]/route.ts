import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

const ParamsSchema = z.object({
  courseId: z.string().uuid()
});

export async function GET(
  _request: Request,
  context: { params: { courseId: string } }
) {
  const parsed = ParamsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  try {
    const supabase = supabaseBrowserClient();
    const userId = "demo-user";

    const { data: progress, error: progressError } = await supabase
      .from("user_course_progress")
      .select(
        "concepts_completed, total_concepts, total_xp, current_streak, last_activity_date"
      )
      .eq("user_id", userId)
      .eq("course_id", parsed.data.courseId)
      .maybeSingle();

    if (progressError) {
      return NextResponse.json(
        { error: "Failed to load progress" },
        { status: 500 }
      );
    }

    const { count: totalConcepts } = await supabase
      .from("concepts")
      .select("*", { count: "exact", head: true })
      .eq("course_id", parsed.data.courseId);

    const completed = progress?.concepts_completed ?? 0;
    const total = progress?.total_concepts ?? totalConcepts ?? 0;
    const percent =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const { count: correctCount } = await supabase
      .from("lesson_attempts")
      .select("*", { count: "exact", head: true })
      .eq("is_correct", true);

    const { count: totalAttempts } = await supabase
      .from("lesson_attempts")
      .select("*", { count: "exact", head: true });

    const quizAccuracy =
      totalAttempts && totalAttempts > 0
        ? Math.round(((correctCount ?? 0) / totalAttempts) * 100)
        : 0;

    return NextResponse.json({
      concepts_completed: completed,
      total_concepts: total,
      percent_caught_up: percent,
      total_xp: progress?.total_xp ?? 0,
      current_streak: progress?.current_streak ?? 0,
      last_activity_date: progress?.last_activity_date ?? null,
      quiz_accuracy: quizAccuracy
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: 500 }
    );
  }
}

