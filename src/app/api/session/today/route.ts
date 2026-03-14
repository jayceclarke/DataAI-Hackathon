import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

const QuerySchema = z.object({
  courseId: z.string().uuid()
});

const DAILY_LESSON_COUNT = 3;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    courseId: url.searchParams.get("courseId")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  try {
    const supabase = supabaseBrowserClient();

    // For hackathon simplicity we omit auth and use a demo user.
    const userId = "demo-user";

    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
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
        user_id: userId,
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

