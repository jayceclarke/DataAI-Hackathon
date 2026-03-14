import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

const ParamsSchema = z.object({
  courseId: z.string().uuid()
});

export async function GET(
  request: Request,
  context: { params: { courseId: string } }
) {
  const parsed = ParamsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const conceptId = url.searchParams.get("conceptId");

  try {
    const supabase = getSupabaseServerClient();
    const userId = "demo-user";

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, daily_goal_minutes")
      .eq("id", parsed.data.courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const dailyGoal = course.daily_goal_minutes ?? 10;

    let query = supabase
      .from("lessons")
      .select(
        `
        id,
        course_id,
        concept_id,
        explanation,
        example,
        mini_exercise,
        xp_reward,
        concepts!inner(
          title,
          estimated_minutes,
          order_index
        ),
        quiz_questions(
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation
        ),
        lesson_attempts!left(
          is_correct
        )
      `
      )
      .eq("course_id", parsed.data.courseId)
      .order("order_index", { referencedTable: "concepts", ascending: true });

    if (conceptId) {
      query = query.eq("concept_id", conceptId);
    }

    const { data: rows, error: lessonsError } = await query;

    if (lessonsError || !rows) {
      return NextResponse.json(
        { error: "Failed to load lessons" },
        { status: 500 }
      );
    }

    const incomplete = rows.filter(row => {
      const attempts = (row as any).lesson_attempts as
        | { is_correct: boolean }[]
        | null;
      if (!attempts || attempts.length === 0) return true;
      return !attempts.some(a => a.is_correct);
    });

    const source = conceptId ? rows : incomplete;

    const sessionLessons: any[] = [];
    let totalMinutes = 0;
    let totalXp = 0;

    for (const row of source) {
      const minutes = (row as any).concepts.estimated_minutes ?? 3;
      if (!conceptId && totalMinutes + minutes > dailyGoal && sessionLessons.length > 0) {
        break;
      }
      totalMinutes += minutes;
      totalXp += row.xp_reward;
      sessionLessons.push(row);
      if (conceptId) {
        break;
      }
    }

    if (sessionLessons.length === 0 && rows.length > 0) {
      sessionLessons.push(rows[0]);
      totalMinutes = (rows[0] as any).concepts.estimated_minutes ?? 3;
      totalXp = rows[0].xp_reward;
    }

    const { data: session, error: sessionError } = await supabase
      .from("session_attempts")
      .insert({
        user_id: userId,
        course_id: parsed.data.courseId
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to start session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_attempt_id: session.id,
      lessons: sessionLessons,
      total_estimated_minutes: totalMinutes,
      total_xp: totalXp
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to build today session" },
      { status: 500 }
    );
  }
}

