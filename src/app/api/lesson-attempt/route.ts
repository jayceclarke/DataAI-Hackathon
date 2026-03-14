import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";

const BodySchema = z.object({
  session_attempt_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  selected_answer: z.enum(["A", "B", "C", "D"])
});

export async function POST(request: Request) {
  const auth = await getAuthUserAndSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from("session_attempts")
      .select("id, user_id")
      .eq("id", parsed.data.session_attempt_id)
      .single();
    if (sessionError || !session || session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quiz_questions")
      .select(
        "id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation"
      )
      .eq("lesson_id", parsed.data.lesson_id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz question not found" },
        { status: 404 }
      );
    }

    const isCorrect = parsed.data.selected_answer === quiz.correct_answer;
    const xpEarned = isCorrect ? 10 : 0;

    const { error: attemptError } = await supabase
      .from("lesson_attempts")
      .insert({
        session_attempt_id: parsed.data.session_attempt_id,
        lesson_id: parsed.data.lesson_id,
        is_correct: isCorrect,
        xp_earned: xpEarned
      });

    if (attemptError) {
      return NextResponse.json(
        { error: "Failed to record attempt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      correct: isCorrect,
      xp_earned: xpEarned,
      explanation: quiz.explanation
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to submit lesson attempt" },
      { status: 500 }
    );
  }
}

