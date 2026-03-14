type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type GeneratedLesson = {
  title: string;
  shortSummary: string;
  difficulty: "intro" | "core" | "advanced";
  estimatedMinutes: number;
  shortExplanation: string;
  example: string;
  quiz: QuizQuestion;
  answerExplanation: string;
};

/**
 * For hackathon/demo purposes, this function is written so you can
 * either:
 * - plug in a real LLM provider using environment variables, or
 * - fall back to a simple deterministic "fake AI" when keys are missing.
 *
 * In production, replace the fake branch with an actual API call.
 */
export async function extractConceptsAndLessons(
  rawText: string
): Promise<GeneratedLesson[]> {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return [];
  }

  const hasRealKey = !!process.env.OPENAI_API_KEY;

  if (!hasRealKey) {
    // Very small, deterministic heuristic: treat each non-empty paragraph
    // as a concept. This lets you demo the product without wiring a model.
    const paragraphs = trimmed
      .split(/\n{2,}/)
      .map(p => p.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 5);

    return paragraphs.map((para, index) => {
      const title =
        para.split(/[.!?]/)[0]?.slice(0, 60).trim() ||
        `Concept ${index + 1}`;

      const baseQuestion =
        para.length > 140 ? para.slice(0, 140) + "…" : para;

      return {
        title,
        shortSummary: para.slice(0, 200),
        difficulty: "core",
        estimatedMinutes: 3,
        shortExplanation: para.slice(0, 160),
        example: `Imagine a simple real-world scenario that reflects: ${title.toLowerCase()}.`,
        quiz: {
          prompt: `According to the lesson, which option best matches the idea of "${title}"?`,
          options: [
            baseQuestion,
            "A completely unrelated concept.",
            "A low-level implementation detail only.",
            "None of the above."
          ],
          correctIndex: 0
        },
        answerExplanation:
          "The first option restates the core idea from the text; the others are intentionally off-target."
      };
    });
  }

  // Skeleton for a real LLM integration.
  // You can call your preferred provider here.
  // Example (pseudo-code):
  //
  // const response = await openai.chat.completions.create({
  //   model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  //   messages: [
  //     {
  //       role: "system",
  //       content:
  //         "You turn course materials into structured micro-lessons as JSON."
  //     },
  //     {
  //       role: "user",
  //       content: `Text:\n${trimmed}\n\nReturn 5–10 concepts in the JSON schema we agreed on.`
  //     }
  //   ],
  //   response_format: { type: "json_object" }
  // });
  //
  // const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
  // map parsed.concepts to GeneratedLesson here.
  //
  // For now, just reuse the fake logic so the app always works.

  return extractConceptsAndLessonsWithoutModel(trimmed);
}

async function extractConceptsAndLessonsWithoutModel(
  rawText: string
): Promise<GeneratedLesson[]> {
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map(p => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 5);

  return paragraphs.map((para, index) => {
    const title =
      para.split(/[.!?]/)[0]?.slice(0, 60).trim() || `Concept ${index + 1}`;

    const baseQuestion =
      para.length > 140 ? para.slice(0, 140) + "…" : para;

    return {
      title,
      shortSummary: para.slice(0, 200),
      difficulty: "core",
      estimatedMinutes: 3,
      shortExplanation: para.slice(0, 160),
      example: `Imagine a simple real-world scenario that reflects: ${title.toLowerCase()}.`,
      quiz: {
        prompt: `According to the lesson, which option best matches the idea of "${title}"?`,
        options: [
          baseQuestion,
          "A completely unrelated concept.",
          "A low-level implementation detail only.",
          "None of the above."
        ],
        correctIndex: 0
      },
      answerExplanation:
        "The first option restates the core idea from the text; the others are intentionally off-target."
    };
  });
}

