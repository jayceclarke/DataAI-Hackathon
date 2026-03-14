import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";

const BodySchema = z.object({
  session_attempt_id: z.string().uuid()
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
      .select(
        "id, user_id, course_id, started_at, completed_at, total_xp_earned"
      )
      .eq("id", parsed.data.session_attempt_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        user_id: user.id,
        course_id: session.course_id,
        total_xp: totalXp
      },
      { onConflict: "user_id,course_id" }
    );

    const today = new Date().toISOString().slice(0, 10);

    const { data: streakRow } = await supabase
      .from("user_course_progress")
      .select("current_streak, last_activity_date")
      .eq("user_id", user.id)
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
      const isToday = last.toISOString().slice(0, 10) === today;

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
      .eq("user_id", user.id)
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

