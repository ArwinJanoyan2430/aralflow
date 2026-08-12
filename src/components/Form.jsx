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
        className="mx-auto w-full max-w-6xl bg-zinc-50 px-4 pb-24 pt-8 transition-colors duration-300 dark:bg-zinc-950 sm:px-6 lg:px-8"
      >
        <div className="text-center">
          <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            How it works
          </p>

          <h2 className="pixel-font mt-3 text-2xl tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            From PDF to study-ready.
          </h2>

          <p className="inter-font mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Upload your material once, choose how you want to study, and let
            AralFlow prepare the rest.
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
              Add your material
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload lecture notes, reviewers, or any readable PDF. Your file
              stays available in your study library for later.
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
              Choose your study tool
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Create a custom practice exam or turn the same material into
              concise, balanced, or detailed AI notes.
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
              Study and improve
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Review generated notes, answer interactive questions, and return
              to saved study materials whenever you need another session.
            </p>
          </div>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-6xl bg-zinc-50 px-4 pb-28 transition-colors duration-300 dark:bg-zinc-950 sm:px-6 lg:px-8"
      >
        <div className="text-center">
          <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Study toolkit
          </p>

          <h2 className="pixel-font mt-3 text-2xl tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            One material, multiple ways to learn.
          </h2>

          <p className="inter-font mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Build active-recall practice and clear study notes directly from
            the PDFs you already use.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              AI
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Practice exams
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Generate 10 to 150 multiple-choice questions grounded in your
              material, with answers and explanations included.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              PDF
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              AI study notes
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Create reviewer, outline, or beginner-friendly notes and choose
              the level of detail that fits your study session.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              ↻
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Saved study library
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Keep PDFs, generated exams, and notes together so your study
              resources are ready whenever you come back.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Form;
