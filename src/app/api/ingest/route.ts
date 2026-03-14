import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { extractConceptsAndLessons } from "@/lib/llm";

const IngestBodySchema = z.object({
  courseId: z.string().uuid().optional(),
  courseTitle: z.string().min(1).max(200).optional(),
  materialTitle: z.string().min(1).max(200),
  rawText: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = IngestBodySchema.parse(json);

    const supabase = supabaseBrowserClient();

    let courseId = parsed.courseId ?? null;

    if (!courseId) {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          title: parsed.courseTitle ?? parsed.materialTitle
        })
        .select("id")
        .single();

      if (courseError || !course) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert course", courseError);
        return NextResponse.json(
          { error: "Failed to create course" },
          { status: 500 }
        );
      }

      courseId = course.id;
    }

    const { data: material, error: materialError } = await supabase
      .from("course_materials")
      .insert({
        course_id: courseId,
        title: parsed.materialTitle,
        raw_text: parsed.rawText,
        source_type: "text"
      })
      .select("id")
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: "Failed to save material" },
        { status: 500 }
      );
    }

    const generated = await extractConceptsAndLessons(parsed.rawText);

    let orderIndex = 0;

    for (const lesson of generated) {
      const { data: concept, error: conceptError } = await supabase
        .from("concepts")
        .insert({
          course_id: courseId,
          material_id: material.id,
          title: lesson.title,
          summary: lesson.shortSummary,
          difficulty: lesson.difficulty,
          estimated_minutes: lesson.estimatedMinutes,
          order_index: orderIndex++
        })
        .select("id")
        .single();

      if (conceptError || !concept) {
        // Skip failed concepts but continue with others.
        // eslint-disable-next-line no-console
        console.error("Failed to insert concept", conceptError);
        // eslint-disable-next-line no-continue
        continue;
      }

      const { error: lessonError } = await supabase.from("lessons").insert({
        concept_id: concept.id,
        short_explanation: lesson.shortExplanation,
        example: lesson.example,
        quiz_question: lesson.quiz,
        quiz_answer_explanation: lesson.answerExplanation
      });

      if (lessonError) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert lesson", lessonError);
      }
    }

    return NextResponse.json(
      {
        courseId,
        materialId: material.id,
        conceptsCreated: generated.length
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to ingest material" },
      { status: 500 }
    );
  }
}

