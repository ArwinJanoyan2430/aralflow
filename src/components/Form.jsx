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
    <div className="min-h-screen bg-zinc-50">
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

                <h2 className="inter-font mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
                  Make studying feel a little easier.
                </h2>

                <p className="inter-font mt-3 text-sm leading-6 text-zinc-500">
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
              <h1 className="pixel-font text-3xl tracking-wide text-zinc-900">
                AralFlow
              </h1>

              <p className="ibm-mono mt-2 text-xs text-zinc-500">
                Built by <strong>Arwin Janoyan</strong>.
              </p>

              <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 lg:hidden">
                Your study companion for AI-powered quizzes, PDF-based prep,
                and a focused learning experience.
              </p>
            </div>

            {/* Form card */}
            <form
              onSubmit={onSubmit}
              className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.2)] sm:p-8"
            >
              {title && (
                <div className="mb-7">
                  <h2 className="inter-font text-xl font-semibold tracking-tight text-zinc-900">
                    {title}
                  </h2>

                  <p className="inter-font mt-1 text-xs text-zinc-400">
                    Enter your details below to continue.
                  </p>
                </div>
              )}

              {children}

              {/* Error */}
              {error && (
                <div className="ibm-mono mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="ibm-mono mt-2 w-full rounded-2xl bg-zinc-900 px-4 py-3.5 text-xs font-semibold text-white shadow-sm transition duration-200 hover:bg-zinc-800 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Please wait..." : buttonText}
              </button>

              {footer}
            </form>

            {/* Footer */}
            <p className="inter-font mt-5 text-center text-[11px] leading-5 text-zinc-400">
              Your information is securely handled by AralFlow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Form;
