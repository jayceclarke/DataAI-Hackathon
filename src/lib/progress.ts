import { getSupabaseServerClient } from "@/lib/supabaseClient";

const USER_ID = "demo-user";

/**
 * Recompute concepts_completed and total_xp for a course from lesson_attempts.
 * Used so dashboard, progress page, and session/complete all stay in sync
 * and re-doing the same concept doesn't double-count.
 */
export async function recomputeCourseProgress(
  courseId: string
): Promise<{ conceptsCompleted: number; totalConcepts: number; totalXp: number }> {
  const supabase = getSupabaseServerClient();

  const { data: conceptsRows } = await supabase
    .from("concepts")
    .select("id")
    .eq("course_id", courseId);

  const { data: lessonsRows } = await supabase
    .from("lessons")
    .select("id, concept_id")
    .eq("course_id", courseId);

  const { data: sessionRows } = await supabase
    .from("session_attempts")
    .select("id")
    .eq("user_id", USER_ID)
    .eq("course_id", courseId);

  const sessionIds = (sessionRows ?? []).map(s => s.id);
  const totalConcepts = conceptsRows?.length ?? 0;

  if (sessionIds.length === 0) {
    return { conceptsCompleted: 0, totalConcepts, totalXp: 0 };
  }

  const { data: correctAttempts } = await supabase
    .from("lesson_attempts")
    .select("lesson_id")
    .in("session_attempt_id", sessionIds)
    .eq("is_correct", true);

  const { data: allAttempts } = await supabase
    .from("lesson_attempts")
    .select("xp_earned")
    .in("session_attempt_id", sessionIds);

  const completedLessonIds = new Set(
    (correctAttempts ?? []).map(a => a.lesson_id as string)
  );
  const totalXp = (allAttempts ?? []).reduce(
    (sum, r) => sum + (Number(r.xp_earned) || 0),
    0
  );

  const lessonToConcept = new Map<string, string>();
  (lessonsRows ?? []).forEach(l => {
    lessonToConcept.set(l.id as string, l.concept_id as string);
  });

  const completedConceptIds = new Set<string>();
  completedLessonIds.forEach(lessonId => {
    const conceptId = lessonToConcept.get(lessonId);
    if (conceptId) completedConceptIds.add(conceptId);
  });

  return {
    conceptsCompleted: completedConceptIds.size,
    totalConcepts,
    totalXp
  };
}
