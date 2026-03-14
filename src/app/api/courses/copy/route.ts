import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserAndSupabase } from "@/lib/supabase/server";

const BodySchema = z.object({
  source_course_id: z.string().uuid()
});

/**
 * Copy a public course into the current user's account.
 * Creates a new course with all concepts, lessons, and quiz questions.
 */
export async function POST(request: Request) {
  const auth = await getAuthUserAndSupabase();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user, supabase } = auth;

  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sourceId = parsed.data.source_course_id;

  const { data: sourceCourse, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, course_code, daily_goal_minutes")
    .eq("id", sourceId)
    .eq("is_public", true)
    .single();

  if (courseErr || !sourceCourse) {
    return NextResponse.json(
      { error: "Course not found or not public" },
      { status: 404 }
    );
  }

  const { data: sourceDocs } = await supabase
    .from("source_documents")
    .select("id, filename, created_at")
    .eq("course_id", sourceId)
    .order("created_at", { ascending: true });

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, title, summary, difficulty, estimated_minutes, order_index, source_document_id")
    .eq("course_id", sourceId)
    .order("order_index", { ascending: true });

  if (!concepts || concepts.length === 0) {
    return NextResponse.json(
      { error: "Course has no concepts to copy" },
      { status: 400 }
    );
  }

  const { data: newCourse, error: insertCourseErr } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      title: sourceCourse.title,
      course_code: sourceCourse.course_code,
      daily_goal_minutes: sourceCourse.daily_goal_minutes ?? 10,
      is_public: false
    })
    .select("id")
    .single();

  if (insertCourseErr || !newCourse) {
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }

  const newCourseId = newCourse.id as string;
  const conceptIdMap = new Map<string, string>();
  const lessonIdMap = new Map<string, string>();
  const sourceDocIdMap = new Map<string, string>();

  for (const doc of sourceDocs ?? []) {
    const { data: newDoc, error: docErr } = await supabase
      .from("source_documents")
      .insert({
        course_id: newCourseId,
        filename: doc.filename ?? "Material",
        file_type: null,
        storage_path: null,
        extracted_text: null
      })
      .select("id")
      .single();
    if (docErr || !newDoc) continue;
    sourceDocIdMap.set(doc.id as string, newDoc.id as string);
  }

  for (const c of concepts) {
    const oldDocId = c.source_document_id as string | null;
    const newDocId = oldDocId ? sourceDocIdMap.get(oldDocId) ?? null : null;

    const { data: newConcept, error: conceptErr } = await supabase
      .from("concepts")
      .insert({
        course_id: newCourseId,
        title: c.title,
        summary: c.summary,
        difficulty: c.difficulty ?? "medium",
        estimated_minutes: c.estimated_minutes ?? 3,
        order_index: c.order_index ?? 0,
        ...(newDocId && { source_document_id: newDocId })
      })
      .select("id")
      .single();

    if (conceptErr || !newConcept) continue;
    conceptIdMap.set(c.id as string, newConcept.id as string);
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, concept_id, explanation, example, mini_exercise, xp_reward")
    .eq("course_id", sourceId);

  if (lessons) {
    for (const l of lessons) {
      const newConceptId = conceptIdMap.get(l.concept_id as string);
      if (!newConceptId) continue;

      const { data: newLesson, error: lessonErr } = await supabase
        .from("lessons")
        .insert({
          course_id: newCourseId,
          concept_id: newConceptId,
          explanation: l.explanation,
          example: l.example,
          mini_exercise: l.mini_exercise,
          xp_reward: l.xp_reward ?? 10
        })
        .select("id")
        .single();

      if (lessonErr || !newLesson) continue;
      lessonIdMap.set(l.id as string, newLesson.id as string);
    }
  }

  const { data: quizQuestions } = await supabase
    .from("quiz_questions")
    .select("lesson_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation")
    .in("lesson_id", lessons?.map(l => l.id) ?? []);

  if (quizQuestions) {
    for (const q of quizQuestions) {
      const newLessonId = lessonIdMap.get(q.lesson_id as string);
      if (!newLessonId) continue;

      await supabase.from("quiz_questions").insert({
        lesson_id: newLessonId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation
      });
    }
  }

  const totalConcepts = conceptIdMap.size;
  await supabase.from("user_course_progress").upsert(
    {
      user_id: user.id,
      course_id: newCourseId,
      total_concepts: totalConcepts,
      concepts_completed: 0,
      total_xp: 0,
      current_streak: 0
    },
    { onConflict: "user_id,course_id" }
  );

  return NextResponse.json(
    { course_id: newCourseId },
    { status: 201 }
  );
}
