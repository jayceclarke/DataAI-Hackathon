"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Lesson = {
  id: string;
  short_explanation: string;
  example: string;
  quiz_question: {
    prompt: string;
    options: string[];
    correctIndex: number;
  };
  quiz_answer_explanation: string;
  concepts: {
    title: string;
  };
};

type TodaySessionResponse = {
  lessons: Lesson[];
  streak: {
    current_streak: number;
    longest_streak: number;
  };
};

export default function SessionPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const router = useRouter();

  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    lessons: Lesson[];
  }>({
    loading: true,
    error: null,
    lessons: []
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean | null;
    xpEarned: number;
  }>({ isCorrect: null, xpEarned: 0 });

  useEffect(() => {
    if (!courseId) return;

    const fetchSession = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(`/api/session/today?courseId=${courseId}`);
        const data: TodaySessionResponse = await response.json();

        if (!response.ok) {
          setState({
            loading: false,
            error: (data as any).error ?? "Failed to load session.",
            lessons: []
          });
          return;
        }

        setState({ loading: false, error: null, lessons: data.lessons });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        setState({
          loading: false,
          error: "Failed to load session.",
          lessons: []
        });
      }
    };

    void fetchSession();
  }, [courseId]);

  const currentLesson = state.lessons[activeIndex];
  const isLastLesson =
    state.lessons.length > 0 && activeIndex === state.lessons.length - 1;
  const hasAnswered = result.isCorrect !== null;

  const handleSubmitAnswer = async () => {
    if (!currentLesson || selectedIndex == null) return;

    try {
      const response = await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          selectedIndex
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ isCorrect: null, xpEarned: 0 });
        return;
      }

      setResult({
        isCorrect: data.isCorrect,
        xpEarned: data.xpEarned
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setResult({ isCorrect: null, xpEarned: 0 });
    }
  };

  const handleNext = () => {
    setSelectedIndex(null);
    setResult({ isCorrect: null, xpEarned: 0 });
    setActiveIndex(prev => prev + 1);
  };

  const handleExit = () => {
    router.push("/");
  };

  if (!courseId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-300">
          No course selected. Start from the upload page.
        </p>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-300">
          Building today&apos;s session…
        </p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-rose-400">{state.error}</p>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-2xl bg-slate-950/70 px-6 py-5 text-center ring-1 ring-slate-800/80">
          <h1 className="text-lg font-semibold text-slate-50">
            You're done for today.
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Come back tomorrow for another tiny batch of concepts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Today&apos;s session
          </p>
          <h1 className="text-xl font-semibold text-slate-50">
            {currentLesson.concepts.title}
          </h1>
          <p className="text-xs text-slate-400">
            Lesson {activeIndex + 1} of {state.lessons.length}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/80">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Explanation
          </h2>
          <p className="text-sm text-slate-100">
            {currentLesson.short_explanation}
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Example
          </h2>
          <p className="text-sm text-slate-100">{currentLesson.example}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quick check
          </h2>
          <p className="text-sm text-slate-100">
            {currentLesson.quiz_question.prompt}
          </p>
          <div className="grid gap-2">
            {currentLesson.quiz_question.options.map((option, index) => {
              const isSelected = selectedIndex === index;
              const correctIndex = currentLesson.quiz_question.correctIndex;
              const isCorrectOption = index === correctIndex;
              const disabled = hasAnswered;

              let optionClasses;
              if (hasAnswered) {
                if (isCorrectOption) {
                  optionClasses =
                    "border-emerald-400 bg-emerald-500/10 text-emerald-100";
                } else if (isSelected) {
                  optionClasses =
                    "border-rose-400 bg-rose-500/10 text-rose-100";
                } else {
                  optionClasses =
                    "border-slate-800 bg-slate-900/60 text-slate-500";
                }
              } else if (isSelected) {
                optionClasses =
                  "border-brand-400 bg-brand-500/10 text-brand-100";
              } else {
                optionClasses =
                  "border-slate-800 bg-slate-900/80 text-slate-100 hover:border-slate-700 hover:bg-slate-900";
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    setSelectedIndex(index);
                  }}
                  disabled={disabled}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${optionClasses}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {result.isCorrect != null && (
          <div className="mt-2 rounded-lg bg-slate-900/80 px-3 py-2 text-xs">
            <p
              className={
                result.isCorrect ? "text-emerald-400" : "text-rose-400"
              }
            >
              {result.isCorrect ? "Nice, that&apos;s right." : "Close, not quite."}
            </p>
            <p className="mt-1 text-slate-300">
              {currentLesson.quiz_answer_explanation}
            </p>
            {result.xpEarned > 0 && (
              <p className="mt-1 text-emerald-400">
                +{result.xpEarned} XP for this concept.
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={selectedIndex == null || hasAnswered}
            className={`inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
              selectedIndex == null || hasAnswered ? "" : "hover:bg-brand-400"
            }`}
          >
            Check answer
          </button>

          {result.isCorrect &&
            activeIndex < state.lessons.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="text-xs font-medium text-brand-200 hover:text-brand-100"
            >
              New question
            </button>
          )}

          <button
            type="button"
            onClick={handleExit}
            className={`text-xs font-medium ${
              result.isCorrect && isLastLesson
                ? "rounded-lg bg-emerald-500 px-3 py-1.5 text-slate-950 shadow shadow-emerald-500/40 hover:bg-emerald-400"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

