import { useEffect, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const UPDATE_NOTICE = {
  version: "v1.2",
  label: "What's new",
  title: "A better way to study",
  description:
    "AralFlow now makes studying smoother with easier file uploads, better exam progress tracking, focused study tools, notes generation, and a more personalized experience.",
  tags: [
    "Drag & Drop PDF",
    "Custom note styles",
    "Pomodoro Timer",
    "To-do-list",
    "AI Notes Generator",
    "PDF & Notes Library",
    "PDF image OCR",
  ],
};

function UpdateNotice() {
  const [showUpdateNotice, setShowUpdateNotice] = useState(
    () => sessionStorage.getItem("show-update-notice") === "true",
  );

  useEffect(() => {
    if (showUpdateNotice) {
      // Consume the login event immediately so a browser refresh cannot show
      // the notice again. A later successful login sets this flag anew.
      sessionStorage.removeItem("show-update-notice");
    }
  }, [showUpdateNotice]);

  useEffect(() => {
    if (!showUpdateNotice) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowUpdateNotice(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showUpdateNotice]);

  const handleDismissUpdate = () => {
    setShowUpdateNotice(false);
    toast.success("Welcome back!");
  };

  if (!showUpdateNotice) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-zinc-950/60 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notice-title"
        className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_32px_100px_-24px_rgba(0,0,0,0.55)] dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top_right,rgba(161,161,170,0.2),transparent_55%)]" />

        <button
          type="button"
          onClick={handleDismissUpdate}
          aria-label="Close update notice"
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/80 bg-white/80 text-zinc-500 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="relative px-7 pb-7 pt-8 sm:px-9 sm:pb-9 sm:pt-9">
          <div className="flex items-center gap-2.5">
            <span className="ibm-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
              {UPDATE_NOTICE.label}
            </span>
            <span className="ibm-mono rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[9px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {UPDATE_NOTICE.version}
            </span>
          </div>

          <h2
            id="update-notice-title"
            className="pixel-font mt-3 max-w-sm text-2xl leading-tight text-zinc-950 dark:text-white sm:text-[28px]"
          >
            {UPDATE_NOTICE.title}
          </h2>

          <p className="inter-font mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {UPDATE_NOTICE.description}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2.5">
            {UPDATE_NOTICE.tags.map((tag) => (
              <div
                key={tag}
                className="inter-font flex min-h-11 items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <Check size={12} strokeWidth={3} />
                </span>
                {tag}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDismissUpdate}
            className="inter-font group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-950/10 transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-950"
          >
            Start studying
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotice;
