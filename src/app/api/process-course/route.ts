import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseBrowserClient } from "@/lib/supabaseClient";
import { extractConceptsAndLessons } from "@/lib/llm";

const BodySchema = z.object({
  course_id: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = BodySchema.parse(json);

    const supabase = supabaseBrowserClient();

    const { data: docs, error: docsError } = await supabase
      .from("source_documents")
      .select("extracted_text")
      .eq("course_id", parsed.course_id);

    if (docsError || !docs || docs.length === 0) {
      return NextResponse.json(
        { error: "No source documents found for course" },
        { status: 400 }
      );
    }

    const combinedText = docs
      .map(d => d.extracted_text as string)
      .join("\n\n")
      .trim();

    if (!combinedText) {
      return NextResponse.json(
        { error: "Source documents contain no text" },
        { status: 400 }
      );
    }

    const generated = await extractConceptsAndLessons(combinedText);

    let orderIndex = 0;
    let conceptsCreated = 0;

    for (const lesson of generated) {
      const { data: concept, error: conceptError } = await supabase
        .from("concepts")
        .insert({
          course_id: parsed.course_id,
          title: lesson.title,
          summary: lesson.shortSummary,
          difficulty: "medium",
          estimated_minutes: lesson.estimatedMinutes,
          order_index: orderIndex++
        })
        .select("id")
        .single();

      if (conceptError || !concept) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert concept", conceptError);
        // eslint-disable-next-line no-continue
        continue;
      }

      conceptsCreated += 1;

      const { data: lessonRow, error: lessonError } = await supabase
        .from("lessons")
        .insert({
          course_id: parsed.course_id,
          concept_id: concept.id,
          explanation: lesson.shortExplanation,
          example: lesson.example,
          mini_exercise: null,
          xp_reward: 10
        })
        .select("id")
        .single();

      if (lessonError || !lessonRow) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert lesson", lessonError);
        // eslint-disable-next-line no-continue
        continue;
      }

      const quiz = lesson.quiz;

      const options = quiz.options.slice(0, 4);
      const letterForIndex = (index: number): "A" | "B" | "C" | "D" => {
        if (index === 0) return "A";
        if (index === 1) return "B";
        if (index === 2) return "C";
        return "D";
      };

      const correctLetter = letterForIndex(quiz.correctIndex);

      const [optionA, optionB, optionC, optionD] = [
        options[0] ?? "",
        options[1] ?? "",
        options[2] ?? "",
        options[3] ?? ""
      ];

      const { error: quizError } = await supabase.from("quiz_questions").insert(
        {
          lesson_id: lessonRow.id,
          question_text: quiz.prompt,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: correctLetter,
          explanation: lesson.answerExplanation
        }
      );

      if (quizError) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert quiz question", quizError);
      }
    }

    // Update fast progress cache for this course (per user will be filled when they start)
    const userId = "demo-user";

    await supabase.from("user_course_progress").upsert(
      {
        user_id: userId,
        course_id: parsed.course_id,
        total_concepts: conceptsCreated
      },
      { onConflict: "user_id,course_id" }
    );

    return NextResponse.json(
      { concepts_created: conceptsCreated },
      { status: 200 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json(
      { error: "Failed to process course" },
      { status: 500 }
    );
  }
}

