import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function PracticeExam() {
  const location = useLocation();
  const navigate = useNavigate();

  const exam = location.state?.exam;
  const fileName = location.state?.fileName;

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!exam) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-2xl">
              ?
            </div>

            <h1 className="pixel-font mt-6 text-2xl text-zinc-900">
              No practice exam found.
            </h1>

            <p className="inter-font mt-4 text-sm leading-6 text-zinc-500">
              Upload a study material first to generate an exam.
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
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

  const answeredCount = Object.keys(answers).length;
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

  const handleSubmit = () => {
    setSubmitted(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const calculateScore = () => {
    return questions.reduce((score, question, index) => {
      return score + (answers[index] === question.answer ? 1 : 0);
    }, 0);
  };

  const score = calculateScore();

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Top section */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
          {/* Back */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inter-font mb-8 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            ← Back to home
          </button>

          {/* Header */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Practice Exam
              </span>
            </div>

            <h1 className="pixel-font break-words text-2xl leading-tight text-zinc-950 sm:text-3xl">
              {fileName}
            </h1>

            <p className="inter-font mt-4 text-sm leading-6 text-zinc-500">
              Test your understanding of the material with{" "}
              <span className="font-semibold text-zinc-700">
                {questions.length} questions
              </span>
              .
            </p>
          </div>

          {/* Progress */}
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Progress
              </span>

              <span className="ibm-mono text-xs font-semibold text-zinc-900">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Exam */}
      <section className="mx-auto max-w-4xl px-6 py-10 sm:px-8 sm:py-14">
        {submitted && (
          <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="ibm-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              Exam completed
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="pixel-font text-4xl text-zinc-900">
                {score}/{questions.length}
              </span>

              <span className="inter-font pb-1 text-sm text-zinc-500">
                correct answers
              </span>
            </div>

            <p className="inter-font mt-3 text-sm text-zinc-600">
              You scored{" "}
              <span className="font-semibold">
                {questions.length
                  ? Math.round(
                      (score / questions.length) * 100,
                    )
                  : 0}
                %
              </span>
              .
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
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm"
              >
                {/* Question header */}
                <div className="border-b border-zinc-100 px-6 py-5 sm:px-7">
                  <div className="flex items-start gap-4">
                    <span className="ibm-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1">
                      <p className="ibm-mono mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        Question {index + 1}
                      </p>

                      <h2 className="inter-font text-base font-semibold leading-7 text-zinc-900 sm:text-lg">
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
                                ? "border-emerald-300 bg-emerald-50"
                                : wrongChoice
                                  ? "border-red-300 bg-red-50"
                                  : selected
                                    ? "border-zinc-900 bg-zinc-900 text-white"
                                    : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50"
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
                                      : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                              }`}
                            >
                              {letter}
                            </span>

                            {/* Choice */}
                            <span
                              className={`inter-font flex-1 text-sm leading-6 ${
                                correctChoice
                                  ? "text-emerald-800"
                                  : wrongChoice
                                    ? "text-red-800"
                                    : selected
                                      ? "text-white"
                                      : "text-zinc-700"
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
                          ? "bg-emerald-50"
                          : isWrong
                            ? "bg-red-50"
                            : "bg-zinc-50"
                      }`}
                    >
                      <p className="ibm-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Explanation
                      </p>

                      <p className="inter-font mt-2 text-sm leading-6 text-zinc-600">
                        {question.explanation}
                      </p>

                      {!isCorrect && (
                        <p className="inter-font mt-3 text-sm font-medium text-zinc-800">
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
          <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inter-font text-sm font-semibold text-zinc-900">
                  Ready to submit?
                </p>

                <p className="inter-font mt-1 text-xs text-zinc-500">
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
                className="inter-font rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0"
              >
                Submit Exam →
              </button>
            </div>
          </div>
        )}

        {/* Bottom */}
        {submitted && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inter-font mt-10 w-full rounded-full bg-zinc-900 px-7 py-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Take Another Exam
          </button>
        )}
      </section>
    </main>
  );
}

export default PracticeExam;