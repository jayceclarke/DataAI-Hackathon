"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type SessionLesson = {
  id: string;
  explanation: string;
  example: string;
  mini_exercise: string | null;
  xp_reward: number;
  concepts: {
    title: string;
  };
  quiz_questions: {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: "A" | "B" | "C" | "D";
    explanation: string;
  }[];
};

type TodaySessionResponse = {
  session_attempt_id: string;
  lessons: SessionLesson[];
  total_estimated_minutes: number;
  total_xp: number;
};

export default function CourseSessionPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId;

  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: TodaySessionResponse | null;
  }>({
    loading: true,
    error: null,
    data: null
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<
    "A" | "B" | "C" | "D" | null
  >(null);
  const [result, setResult] = useState<{
    correct: boolean | null;
    xp: number;
    explanation: string | null;
  }>({
    correct: null,
    xp: 0,
    explanation: null
  });
  const [xpTotal, setXpTotal] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [progressMeta, setProgressMeta] = useState<{
    totalXp: number;
    currentStreak: number;
  } | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      setState({ loading: true, error: null, data: null });

      try {
        const conceptId = searchParams.get("conceptId");
        const url = conceptId
          ? `/api/courses/${courseId}/today-session?conceptId=${conceptId}`
          : `/api/courses/${courseId}/today-session`;

        const response = await fetch(url);
        const data: TodaySessionResponse = await response.json();

        if (!response.ok) {
          setState({
            loading: false,
            error: (data as any).error ?? "Failed to load session.",
            data: null
          });
          return;
        }

        setState({ loading: false, error: null, data });
        setXpTotal(0);
        setActiveIndex(0);
        setSelectedAnswer(null);
        setResult({ correct: null, xp: 0, explanation: null });
        setSessionComplete(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        setState({
          loading: false,
          error: "Failed to load session.",
          data: null
        });
      }
    };

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/progress/${courseId}`);
        if (!response.ok) return;
        const data = await response.json();
        setProgressMeta({
          totalXp: data.total_xp ?? 0,
          currentStreak: data.current_streak ?? 0
        });
      } catch {
        // ignore progress errors for now
      }
    };

    void fetchSession();
    void fetchProgress();
  }, [courseId, searchParams]);

  const currentLesson =
    state.data && state.data.lessons[activeIndex]
      ? state.data.lessons[activeIndex]
      : null;
  const isLastLesson =
    state.data && state.data.lessons.length > 0
      ? activeIndex === state.data.lessons.length - 1
      : false;

  // eslint-disable-next-line no-console
  console.log("CourseSessionPage render", {
    courseId,
    activeIndex,
    hasData: !!state.data
  });

  const handleCheckAnswer = async () => {
    if (!state.data || !currentLesson || !selectedAnswer) return;

    const quiz = currentLesson.quiz_questions[0];
    if (!quiz) return;

    try {
      const response = await fetch("/api/lesson-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_attempt_id: state.data.session_attempt_id,
          lesson_id: currentLesson.id,
          selected_answer: selectedAnswer
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          correct: null,
          xp: 0,
          explanation: null
        });
        return;
      }

      setResult({
        correct: data.correct,
        xp: data.xp_earned,
        explanation: data.explanation
      });

      if (data.xp_earned > 0) {
        setXpTotal(prev => prev + data.xp_earned);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setResult({
        correct: null,
        xp: 0,
        explanation: null
      });
    }
  };

  const handleNext = () => {
    if (!state.data) return;

    if (activeIndex < state.data.lessons.length - 1) {
      setActiveIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setResult({ correct: null, xp: 0, explanation: null });
    } else {
      setSessionComplete(true);
      void completeSession();
    }
  };

  const completeSession = async () => {
    if (!state.data) return;

    try {
      await fetch("/api/session/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_attempt_id: state.data.session_attempt_id
        })
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const handleExit = async () => {
    if (result.correct && isLastLesson && !sessionComplete) {
      await completeSession();
    }

    router.push(`/courses/${courseId}/concepts`);
  };

  if (state.loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-300">
          Building today's session…
        </p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-rose-400">
          {state.error ?? "Failed to load session."}
        </p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-2xl bg-slate-950/70 px-6 py-5 text-center ring-1 ring-slate-800/80">
          <h1 className="text-lg font-semibold text-slate-50">
            Session complete
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Nice work—another small step toward being fully caught up.
          </p>
          <p className="mt-3 text-sm text-emerald-400">
            You earned <span className="font-semibold">{xpTotal}</span> XP
            today.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 hover:bg-brand-400"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-300">
          No lessons available. Try uploading material for this course.
        </p>
      </div>
    );
  }

  const quiz = currentLesson.quiz_questions[0];

  const progress =
    (state.data.lessons.length > 0
      ? ((activeIndex + 1) / state.data.lessons.length) * 100
      : 0) | 0;

  const lessonsRemaining =
    state.data.lessons.length - activeIndex > 0
      ? state.data.lessons.length - activeIndex
      : 0;
  const avgMinutesPerLesson =
    state.data.lessons.length > 0
      ? state.data.total_estimated_minutes / state.data.lessons.length
      : 0;
  const minutesLeft = Math.max(
    0,
    Math.round(lessonsRemaining * avgMinutesPerLesson)
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Today's session
          </p>
          <h1 className="text-xl font-semibold text-slate-50">
            {currentLesson.concepts.title}
          </h1>
          <p className="text-xs text-slate-400">
            Lesson {activeIndex + 1} of {state.data.lessons.length} ·{" "}
            {state.data.total_estimated_minutes} min ·{" "}
            {xpTotal}/{state.data.total_xp} XP
          </p>
        </div>
        {progressMeta && (
          <div className="rounded-full bg-slate-900/80 px-3 py-1 text-right text-[11px] text-slate-300 ring-1 ring-slate-800/80">
            <p>
              <span className="font-semibold">
                {progressMeta.currentStreak}
              </span>{" "}
              day streak
            </p>
            <p>
              <span className="font-semibold">{progressMeta.totalXp}</span> XP
            </p>
          </div>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {minutesLeft > 0 && (
        <p className="text-[11px] text-slate-400">
          ~{minutesLeft} min left in today&apos;s session.
        </p>
      )}

      <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Explanation
          </h2>
          <p className="text-sm text-slate-100">
            {currentLesson.explanation}
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Example
          </h2>
          <p className="text-sm text-slate-100">{currentLesson.example}</p>
        </div>

        {currentLesson.mini_exercise && (
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Mini exercise
            </h2>
            <p className="text-sm text-slate-100">
              {currentLesson.mini_exercise}
            </p>
          </div>
        )}

        {quiz && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quick check
            </h2>
            <p className="text-sm text-slate-100">
              {quiz.question_text}
            </p>
            <div className="grid gap-2">
              {(["A", "B", "C", "D"] as const).map(letter => {
                const text =
                  letter === "A"
                    ? quiz.option_a
                    : letter === "B"
                      ? quiz.option_b
                      : letter === "C"
                        ? quiz.option_c
                        : quiz.option_d;

                if (!text) return null;

                const selected = selectedAnswer === letter;
                const disabled = result.correct === true;
                const isCorrectOption = letter === quiz.correct_answer;

                let optionClasses;
                if (result.correct != null) {
                  if (isCorrectOption) {
                    optionClasses =
                      "border-emerald-400 bg-emerald-500/10 text-emerald-100";
                  } else if (selected) {
                    optionClasses =
                      "border-rose-400 bg-rose-500/10 text-rose-100";
                  } else {
                    optionClasses =
                      "border-slate-800 bg-slate-900/60 text-slate-500";
                  }
                } else if (selected) {
                  optionClasses =
                    "border-brand-400 bg-brand-500/10 text-brand-100";
                } else {
                  optionClasses =
                    "border-slate-800 bg-slate-900/80 text-slate-100 hover:border-slate-700 hover:bg-slate-900";
                }

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      if (disabled) return;
                      setSelectedAnswer(letter);
                    }}
                    disabled={disabled}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${optionClasses}`}
                  >
                    <span className="mr-2 font-semibold text-slate-400">
                      {letter}.
                    </span>
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {result.correct != null && (
          <div className="mt-2 rounded-lg bg-slate-900/80 px-3 py-2 text-xs">
            <p
              className={
                result.correct ? "text-emerald-400" : "text-rose-400"
              }
            >
              {result.correct ? "Nice, that's right." : "Close, not quite."}
            </p>
            {result.explanation && (
              <p className="mt-1 text-slate-300">{result.explanation}</p>
            )}
            {result.xp > 0 && (
              <p className="mt-1 text-emerald-400">
                +{result.xp} XP for this concept.
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Check your answer to save progress and mark this concept as done.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={!selectedAnswer}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Check answer
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={result.correct == null}
              className="text-xs font-medium text-brand-200 hover:text-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeIndex < state.data.lessons.length - 1
                ? "Next concept →"
                : "Finish session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

