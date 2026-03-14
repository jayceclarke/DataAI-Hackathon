import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

const BodySchema = z.object({
  session_attempt_id: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const supabase = supabaseBrowserClient();
    const userId = "demo-user";

    const { data: session, error: sessionError } = await supabase
      .from("session_attempts")
      .select("id, user_id, course_id, started_at, completed_at, total_xp_earned")
      .eq("id", parsed.data.session_attempt_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const { data: lessonAttempts, error: attemptsError } = await supabase
      .from("lesson_attempts")
      .select("xp_earned")
      .eq("session_attempt_id", parsed.data.session_attempt_id);

    if (attemptsError || !lessonAttempts) {
      return NextResponse.json(
        { error: "Failed to load lesson attempts" },
        { status: 500 }
      );
    }

    const xpFromLessons = lessonAttempts.reduce(
      (sum, attempt) => sum + (attempt.xp_earned as number),
      0
    );

    const totalXp = xpFromLessons;

    await supabase
      .from("session_attempts")
      .update({
        completed_at: new Date().toISOString(),
        total_xp_earned: totalXp
      })
      .eq("id", parsed.data.session_attempt_id);

    await supabase.from("user_course_progress").upsert(
      {
        user_id: userId,
        course_id: session.course_id,
        total_xp: totalXp
      },
      { onConflict: "user_id,course_id" }
    );

    const today = new Date().toISOString().slice(0, 10);

    const { data: streakRow } = await supabase
      .from("user_course_progress")
      .select("current_streak, last_activity_date")
      .eq("user_id", userId)
      .eq("course_id", session.course_id)
      .maybeSingle();

    let currentStreak = 1;
    if (streakRow && streakRow.last_activity_date) {
      const last = new Date(streakRow.last_activity_date as string);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        last.toISOString().slice(0, 10) ===
        yesterday.toISOString().slice(0, 10);
      const isToday =
        last.toISOString().slice(0, 10) === today;

      if (isToday) {
        currentStreak = streakRow.current_streak;
      } else if (isYesterday) {
        currentStreak = streakRow.current_streak + 1;
      } else {
        currentStreak = 1;
      }
    }

    await supabase
      .from("user_course_progress")
      .update({
        current_streak: currentStreak,
        last_activity_date: today
      })
      .eq("user_id", userId)
      .eq("course_id", session.course_id);

    return NextResponse.json({
      total_xp: totalXp,
      current_streak: currentStreak
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to complete session" },
      { status: 500 }
    );
  }
}

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

