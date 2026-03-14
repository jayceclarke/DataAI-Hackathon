import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";

const QuerySchema = z.object({
  courseId: z.string().uuid()
});

const DAILY_LESSON_COUNT = 3;

export async function GET(request: Request) {
  const auth = await getAuthUserAndSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    courseId: url.searchParams.get("courseId")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  try {
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", parsed.data.courseId)
      .eq("user_id", user.id)
      .single();
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const todayLessons = await supabase
      .from("lessons")
      .select(
        `
        id,
        concept_id,
        short_explanation,
        example,
        quiz_question,
        quiz_answer_explanation,
        concepts!inner (
          title,
          order_index
        ),
        user_lessons (completed)
      `
      )
      .eq("concepts.course_id", parsed.data.courseId)
      .order("order_index", { referencedTable: "concepts", ascending: true })
      .limit(DAILY_LESSON_COUNT);

    if (todayLessons.error || !todayLessons.data) {
      return NextResponse.json(
        { error: "Failed to load lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      lessons: todayLessons.data,
      streak: streakRow ?? {
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load today session" },
      { status: 500 }
    );
  }
}

