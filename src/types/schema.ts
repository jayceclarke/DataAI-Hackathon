export type Difficulty = "easy" | "medium" | "hard";

export type Concept = {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  estimated_minutes: number;
  order_index: number;
};

export type Lesson = {
  id: string;
  course_id: string;
  concept_id: string;
  explanation: string;
  example: string;
  mini_exercise: string | null;
  xp_reward: number;
};

export type QuizQuestion = {
  id: string;
  lesson_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
};

export type UserCourseProgress = {
  id: string;
  user_id: string;
  course_id: string;
  concepts_completed: number;
  total_concepts: number;
  total_xp: number;
  current_streak: number;
  last_activity_date: string | null;
  updated_at: string;
};

