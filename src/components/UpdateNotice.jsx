import { useEffect, useState } from "react";
import toast from "react-hot-toast"

const UPDATE_NOTICE = {
  version: "v1.1",
  label: "What's new",
  title: "A better way to study",
  description:
    "AralFlow now makes studying smoother with easier file uploads, better exam progress tracking, focused study tools, and a more personalized experience.",
  tags: [
    "Drag & Drop PDF",
    "Exam Progress",
    "Pomodoro",
    "Profile Menu",
    "Dark Mode",
  ],
};

function UpdateNotice() {
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);
  
  useEffect(() => {
    if (sessionStorage.getItem("show-update-notice") === "true") {
      // Consume the login event immediately so a browser refresh cannot show
      // the notice again. A later successful login sets this flag anew.
      sessionStorage.removeItem("show-update-notice");
      setShowUpdateNotice(true);
    }
  }, []);

  const handleDismissUpdate = () => {
    setShowUpdateNotice(false);
    toast.success("Welcome back!");
  };

  if (!showUpdateNotice) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-[32px] border border-zinc-200 bg-white p-7 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={handleDismissUpdate}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
        >
          ×
        </button>

        <div className="mt-6 flex items-center gap-2">
          <span className="ibm-mono text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            {UPDATE_NOTICE.label}
          </span>

          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[9px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            {UPDATE_NOTICE.version}
          </span>
        </div>

        <h2 className="pixel-font mt-3 text-xl text-zinc-900 dark:text-white">
          {UPDATE_NOTICE.title}
        </h2>

        <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {UPDATE_NOTICE.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {UPDATE_NOTICE.tags.map((tag) => (
            <span
              key={tag}
              className="ibm-mono rounded-full bg-zinc-100 px-3 py-1.5 text-[9px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={handleDismissUpdate}
          className="inter-font mt-7 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default UpdateNotice;
