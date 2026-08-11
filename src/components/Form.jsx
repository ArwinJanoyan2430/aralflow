import FloatingImages from "../components/FloatingImages";

function Form({
  title,
  children,
  buttonText,
  loading = false,
  error,
  footer,
  onSubmit,
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Background decorations */}
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_420px]">

          {/* Left side */}
          <div className="hidden lg:block">
            <div className="flex flex-col items-center justify-center">
              
              {/* Animation */}
              <FloatingImages />

              <div className="mt-4 max-w-md text-center">
                <p className="ibm-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                  Learn • Practice • Improve
                </p>

                <h2 className="inter-font mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Make studying feel a little easier.
                </h2>

                <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Turn your notes and study materials into a more focused
                  learning experience with AralFlow.
                </p>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="w-full">
            
            {/* Branding */}
            <div className="mb-6 text-center">
              <h1 className="pixel-font text-3xl tracking-wide text-zinc-900 dark:text-white">
                AralFlow
              </h1>

              <p className="ibm-mono mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Built by <strong>Arwin Janoyan</strong>.
              </p>

              <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 lg:hidden">
                Your study companion for AI-powered quizzes, PDF-based prep,
                and a focused learning experience.
              </p>
            </div>

            {/* Form card */}
            <form
              onSubmit={onSubmit}
              className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.2)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
            >
              {title && (
                <div className="mb-7">
                  <h2 className="inter-font text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    {title}
                  </h2>

                  <p className="inter-font mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Enter your details below to continue.
                  </p>
                </div>
              )}

              {children}

              {/* Error */}
              {error && (
                <div className="ibm-mono mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="ibm-mono mt-2 w-full rounded-2xl bg-zinc-900 px-4 py-3.5 text-xs font-semibold text-white shadow-sm transition duration-200 hover:bg-zinc-800 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Please wait..." : buttonText}
              </button>

              {footer}
            </form>

            {/* Footer */}
              <p className="inter-font mt-5 text-center text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
              Your information is securely handled by AralFlow.
            </p>
          </div>
        </div>
      </div>
      
      <section
        id="how-it-works"
        className="px-4 transition-colors duration-300 bg-zinc-50 max-x-1xl pb-20 pt-0 sm:px-10 lg:px-80 dark:bg-zinc-950"
      >
        <div className="text-center">
          <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            How it works
          </p>

          <h2 className="pixel-font mt-3 text-2xl tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            From notes to practice.
          </h2>

          <p className="inter-font mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            AralFlow turns your study materials into practice exams in just a
            few simple steps.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {/* Step 01 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                01
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                PDF
              </div>
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Upload your notes
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload your PDF study material. AralFlow securely processes the
              content so it can understand what you need to study.
            </p>
          </div>

          {/* Step 02 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                02
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                AI
              </div>
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Generate your exam
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Choose how many questions you want and let AralFlow generate a
              practice exam based on your uploaded material.
            </p>
          </div>

          {/* Step 03 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                03
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                ✓
              </div>
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Practice & improve
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Take your interactive practice exam, review your answers, and
              retake saved exams whenever you want.
            </p>
          </div>
        </div>
      </section>

      <section
        className="px-4 transition-colors duration-300 bg-zinc-50 max-x-1xl pb-30 pt-0 sm:px-10 lg:px-80 dark:bg-zinc-950"
      >
        <div className="text-center">
          <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Featured
          </p>

          <h2 className="pixel-font mt-3 text-2xl tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Everything you need to study better.
          </h2>

          <p className="inter-font mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Simple tools designed to turn your study materials into effective
            exam preparation.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              AI
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              AI-generated exams
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Turn your PDFs into customized practice questions using the
              content of your own study materials.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              PDF
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              PDF-based studying
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload your lecture notes, reviewers, and other PDF materials and
              keep everything organized in one place.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              ↻
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Retake anytime
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Your generated exams are saved so you can return to them and
              practice whenever you need.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Form;
