import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";

const ParamsSchema = z.object({
  courseId: z.string().uuid()
});

export async function DELETE(
  _request: Request,
  context: { params: { courseId: string } }
) {
  const auth = await getAuthUserAndSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  const parsed = ParamsSchema.safeParse(context.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const courseId = parsed.data.courseId;

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .single();
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {

    const fail = (message: string, err: unknown) => {
      // eslint-disable-next-line no-console
      console.error(message, err);
      return NextResponse.json(
        {
          error: "Failed to delete course",
          details: err && typeof (err as { message?: string }).message === "string" ? (err as { message: string }).message : message
        },
        { status: 500 }
      );
    };

    const { data: sessions } = await supabase
      .from("session_attempts")
      .select("id")
      .eq("course_id", courseId);
    const sessionIds = (sessions ?? []).map(s => s.id as string);

    if (sessionIds.length > 0) {
      const { error: e1 } = await supabase
        .from("lesson_attempts")
        .delete()
        .in("session_attempt_id", sessionIds);
      if (e1) return fail("lesson_attempts delete", e1);
    }

    const { error: e2 } = await supabase
      .from("session_attempts")
      .delete()
      .eq("course_id", courseId);
    if (e2) return fail("session_attempts delete", e2);

    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId);
    const lessonIds = (lessons ?? []).map(l => l.id as string);

    if (lessonIds.length > 0) {
      const { error: e3 } = await supabase
        .from("quiz_questions")
        .delete()
        .in("lesson_id", lessonIds);
      if (e3) return fail("quiz_questions delete", e3);
    }

    const { error: e4 } = await supabase.from("lessons").delete().eq("course_id", courseId);
    if (e4) return fail("lessons delete", e4);

    const { error: e5 } = await supabase.from("concepts").delete().eq("course_id", courseId);
    if (e5) return fail("concepts delete", e5);

    const { error: e6 } = await supabase.from("user_course_progress").delete().eq("course_id", courseId);
    if (e6) return fail("user_course_progress delete", e6);

    const { error: sourceErr } = await supabase
      .from("source_documents")
      .delete()
      .eq("course_id", courseId);
    if (sourceErr) {
      // source_documents may not exist or have course_id; ignore
    }

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (error) return fail("courses delete", error);

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("DELETE course exception:", error);
    const details = error && typeof (error as { message?: string }).message === "string" ? (error as { message: string }).message : undefined;
    return NextResponse.json(
      { error: "Failed to delete course", details },
      { status: 500 }
    );
  }
}

