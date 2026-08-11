import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const PASSING_PERCENTAGE = 75;

function PracticeExam() {
  const location = useLocation();
  const navigate = useNavigate();

  const exam = location.state?.exam;
  const fileName = location.state?.fileName;
  const materialId = location.state?.materialId;
  const isReview = location.state?.review === true;
  const displayFileName = fileName?.replace(/^\d+-/, "") || "Practice Exam";

  const [answers, setAnswers] = useState(() => {
    if (!isReview || !Array.isArray(exam?.completion?.answers)) return {};

    return Object.fromEntries(
      exam.completion.answers.map((answer, index) => [index, answer]),
    );
  });
  const [submitted, setSubmitted] = useState(isReview);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Leaving only discards local answers. Results are persisted exclusively by
  // handleSubmit after every question has been answered.
  const handleBackHome = () => {
    navigate("/");
  };

  if (!exam) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-20 dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-2xl dark:bg-zinc-800 dark:text-white">
              ?
            </div>

            <h1 className="pixel-font mt-6 text-2xl text-zinc-900 dark:text-white">
              No practice exam found.
            </h1>

            <p className="inter-font mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload a study material first to generate an exam.
            </p>

            <button
              type="button"
              onClick={handleBackHome}
              className="inter-font mt-7 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const questions = exam.questions || [];

  const answeredCount = Object.values(answers).filter(
    (answer) => answer !== null && answer !== undefined && answer !== "",
  ).length;
  const progress =
    questions.length > 0
      ? Math.round((answeredCount / questions.length) * 100)
      : 0;

  const handleAnswer = (questionIndex, answer) => {
    if (submitted) return;

    setAnswers((previous) => ({
      ...previous,
      [questionIndex]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (answeredCount !== questions.length) {
      setSubmitError("Answer every question before submitting the exam.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      if (materialId) {
        const { data: { user }, error: userError } =
          await supabase.auth.getUser();

        if (userError || !user) {
          throw userError || new Error("You must be signed in to save a score.");
        }

        const completion = {
          score: calculateScore(),
          total: questions.length,
          completedAt: new Date().toISOString(),
          answers: questions.map((_, index) => answers[index] ?? null),
        };
        const { error } = await supabase
          .from("finished_exams")
          .upsert(
            {
              material_id: materialId,
              user_id: user.id,
              score: completion.score,
              total: completion.total,
              answers: completion.answers,
              completed_at: completion.completedAt,
            },
            { onConflict: "material_id" },
          );

        if (error) {
          throw error;
        }
      }

      setSubmitted(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Failed to save exam result:", error);
      setSubmitError(
        error?.message || "Your score could not be saved. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = () => {
    return questions.reduce((score, question, index) => {
      return score + (answers[index] === question.answer ? 1 : 0);
    }, 0);
  };

  const score = isReview && exam.completion
    ? exam.completion.score
    : calculateScore();
  const percentage = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;
  const passed = percentage >= PASSING_PERCENTAGE;

  return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Top section */}
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
          {/* Back */}
          <button
            type="button"
            onClick={handleBackHome}
            className="ibm-mono mb-6 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to home
          </button>

          {/* Header */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Practice Exam
              </span>
            </div>

            <h1 className="pixel-font break-words text-2xl leading-tight text-zinc-950 dark:text-white sm:text-3xl">
              {displayFileName}
            </h1>

            <p className="inter-font mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Test your understanding of the material with{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                {questions.length} questions
              </span>
              .
            </p>
          </div>

        </div>
      </section>

      {/* Sticky, compact progress indicator */}
      <div className="sticky top-3 z-30 mx-auto max-w-4xl px-4 sm:px-8">
        <div
          aria-live="polite"
          className="mt-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="ibm-mono shrink-0 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Progress
            </span>

            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="ibm-mono shrink-0 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Exam */}
      <section className="mx-auto md:-mt-10 -mt-6 max-w-4xl px-6 py-10 sm:px-8 sm:py-14">
        {submitted && (
          <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="ibm-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              Exam completed
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="pixel-font text-4xl text-zinc-900 dark:text-white">
                {score}/{questions.length}
              </span>

              <span className="inter-font pb-1 text-sm text-zinc-500 dark:text-zinc-400">
                correct answers
              </span>
            </div>

            <p className="inter-font mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              You scored{" "}
              <span className="font-semibold">
                {percentage}%
              </span>
              . You {passed ? "passed" : "failed"}.
            </p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const selectedAnswer = answers[index];

            const isCorrect =
              submitted &&
              selectedAnswer === question.answer;

            const isWrong =
              submitted &&
              selectedAnswer &&
              selectedAnswer !== question.answer;

            return (
              <article
                key={index}
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Question header */}
                <div className="border-b border-zinc-100 px-6 py-5 sm:px-7 dark:border-zinc-800">
                  <div className="flex items-start gap-4">
                    <span className="ibm-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1">
                      <p className="ibm-mono mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        Question {index + 1}
                      </p>

                      <h2 className="inter-font text-base font-semibold leading-7 text-zinc-900 dark:text-white sm:text-lg">
                        {question.question}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Choices */}
                <div className="p-5 sm:p-7">
                  <div className="space-y-3">
                    {(question.choices || []).map(
                      (choice, choiceIndex) => {
                        const letter = String.fromCharCode(
                          65 + choiceIndex,
                        );

                        const selected =
                          selectedAnswer === choice;

                        const correctChoice =
                          submitted &&
                          choice === question.answer;

                        const wrongChoice =
                          submitted &&
                          selected &&
                          choice !== question.answer;

                        return (
                          <button
                            key={choiceIndex}
                            type="button"
                            disabled={submitted}
                            onClick={() =>
                              handleAnswer(index, choice)
                            }
                            className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                              correctChoice
                                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                                : wrongChoice
                                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                                  : selected
                                    ? "border-zinc-900 bg-zinc-900 text-white"
                                    : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {/* Letter */}
                            <span
                              className={`ibm-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition ${
                                correctChoice
                                  ? "bg-emerald-500 text-white"
                                  : wrongChoice
                                    ? "bg-red-500 text-white"
                                    : selected
                                      ? "bg-white text-zinc-900"
                                      : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700"
                              }`}
                            >
                              {letter}
                            </span>

                            {/* Choice */}
                            <span
                              className={`inter-font flex-1 text-sm leading-6 ${
                                correctChoice
                                  ? "text-emerald-800 dark:text-emerald-300"
                                  : wrongChoice
                                    ? "text-red-800 dark:text-red-300"
                                    : selected
                                      ? "text-white"
                                      : "text-zinc-700 dark:text-zinc-200"
                              }`}
                            >
                              {choice}
                            </span>

                            {/* Result icon */}
                            {submitted &&
                              correctChoice && (
                                <span className="text-emerald-600">
                                  ✓
                                </span>
                              )}

                            {submitted &&
                              wrongChoice && (
                                <span className="text-red-500">
                                  ×
                                </span>
                              )}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {/* Explanation */}
                  {submitted && (
                    <div
                      className={`mt-5 rounded-2xl p-4 ${
                        isCorrect
                          ? "bg-emerald-50 dark:bg-emerald-950/40"
                          : isWrong
                            ? "bg-red-50 dark:bg-red-950/40"
                            : "bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      <p className="ibm-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Explanation
                      </p>

                      <p className="inter-font mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {question.explanation}
                      </p>

                      {!isCorrect && (
                        <p className="inter-font mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          Correct answer:{" "}
                          {question.answer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Submit */}
        {!submitted && (
          <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inter-font text-sm font-semibold text-zinc-900 dark:text-white">
                  Ready to submit?
                </p>

                <p className="inter-font mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {answeredCount === questions.length
                    ? "All questions answered."
                    : `${questions.length - answeredCount} question${
                        questions.length - answeredCount === 1
                          ? ""
                          : "s"
                      } unanswered.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || answeredCount !== questions.length}
                className="inter-font rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving result..." : "Submit Exam →"}
              </button>
            </div>

            {submitError && (
              <p className="inter-font mt-4 text-sm text-red-600 dark:text-red-400">
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* Bottom */}
        {submitted && (
          <button
            type="button"
            onClick={handleBackHome}
            className="inter-font mt-10 w-full rounded-full bg-zinc-900 px-7 py-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Return to Home
          </button>
        )}
      </section>
    </main>
  );
}

export default PracticeExam;
