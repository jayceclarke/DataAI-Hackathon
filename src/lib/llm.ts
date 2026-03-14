import OpenAI from "openai";

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

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

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

  const hasRealKey = !!openai;

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

  try {
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert tutor turning course materials into tiny micro-lessons for students who are behind. " +
            "You must respond with STRICT JSON only, no prose, matching the schema: { concepts: [...] }."
        },
        {
          role: "user",
          content: [
            "Given the following course material, extract 5-10 key concepts for a student catching up after missing class.",
            "",
            "For each concept, return:",
            "- title: short descriptive name",
            "- short_summary: 1-2 sentences, beginner-friendly, plain language",
            "- difficulty: one of intro, core, advanced",
            "- estimated_minutes: integer between 2 and 5",
            "- lesson:",
            "  - short_explanation: 1-2 sentence explanation",
            "  - example: concrete, real-world or system example",
            "  - quiz_question:",
            "    - prompt: one multiple choice question checking understanding",
            "    - options: array of 4 options",
            "    - correct_index: 0-based index of the correct option",
            "  - answer_explanation: why the correct option is correct",
            "",
            "Text:",
            trimmed
          ].join("\n")
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return extractConceptsAndLessonsWithoutModel(trimmed);
    }

    type LlmConcept = {
      title?: string;
      short_summary: string;
      difficulty?: "intro" | "core" | "advanced";
      estimated_minutes?: number;
      lesson: {
        short_explanation: string;
        example: string;
        quiz_question: {
          prompt: string;
          options: string[];
          correct_index: number;
        };
        answer_explanation: string;
      };
    };

    const parsed = JSON.parse(content) as { concepts?: LlmConcept[] };
    if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
      return extractConceptsAndLessonsWithoutModel(trimmed);
    }

    return parsed.concepts.map((concept, index): GeneratedLesson => {
      const title =
        concept.title && concept.title.trim().length > 0
          ? concept.title.trim()
          : `Concept ${index + 1}`;

      const difficulty = concept.difficulty ?? "core";
      const estimatedMinutes =
        typeof concept.estimated_minutes === "number"
          ? Math.min(5, Math.max(2, concept.estimated_minutes))
          : 3;

      const quizOptions =
        concept.lesson.quiz_question.options.slice(0, 4) ?? [];
      while (quizOptions.length < 4) {
        quizOptions.push("Placeholder option");
      }

      const correctIndex = Math.min(
        3,
        Math.max(0, concept.lesson.quiz_question.correct_index)
      );

      return {
        title,
        shortSummary: concept.short_summary,
        difficulty,
        estimatedMinutes,
        shortExplanation: concept.lesson.short_explanation,
        example: concept.lesson.example,
        quiz: {
          prompt: concept.lesson.quiz_question.prompt,
          options: quizOptions,
          correctIndex
        },
        answerExplanation: concept.lesson.answer_explanation
      };
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("LLM extraction failed, falling back to heuristic:", error);
    const msg = error && typeof (error as { message?: string }).message === "string" ? (error as { message: string }).message : "";
    if (msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("AuthenticationError")) {
      // eslint-disable-next-line no-console
      console.warn("OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local and that the key is valid at https://platform.openai.com/api-keys");
    }
    return extractConceptsAndLessonsWithoutModel(trimmed);
  }
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

