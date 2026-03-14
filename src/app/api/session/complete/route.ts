import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

const BodySchema = z.object({
  lessonId: z.string().uuid(),
  selectedIndex: z.number().int().min(0)
});

const XP_PER_LESSON = 10;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { lessonId, selectedIndex } = parsed.data;
    const supabase = supabaseBrowserClient();
    const userId = "demo-user";

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select(
        `
        id,
        quiz_question,
        concepts!inner (
          course_id
        )
      `
      )
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const quiz = lesson.quiz_question as {
      correctIndex: number;
    };

    const isCorrect = selectedIndex === quiz.correctIndex;
    const xpEarned = isCorrect ? XP_PER_LESSON : 0;

    await supabase.from("user_lessons").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: isCorrect,
        correct_last_attempt: isCorrect,
        xp_earned: xpEarned
      },
      { onConflict: "user_id,lesson_id" }
    );

    if (isCorrect) {
      await supabase.rpc("increment_course_stats", {
        p_user_id: userId,
        p_course_id: lesson.concepts.course_id,
        p_xp_delta: xpEarned
      });
    }

    return NextResponse.json({ isCorrect, xpEarned });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to complete lesson" },
      { status: 500 }
    );
  }
}

