import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";

function Pomodoro() {
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);

  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const [mode, setMode] = useState("focus");

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const isBreak = mode === "break";

  // Circular progress
  const progress = ((totalTime - remainingSeconds) / totalTime) * 100;

  const circumference = 289;

  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // -----------------------------
  // Timer Controls
  // -----------------------------

  function handleStart() {
    // Don't start if timer is already finished
    if (remainingSeconds <= 0) return;

    setPaused(false);
    setIsRunning(true);
  }

  function handlePause() {
    setPaused(true);
    setIsRunning(false);
  }

  function handleReset() {
    setSpinning(true);

    const focusTime = 25 * 60;

    setRemainingSeconds(focusTime);
    setTotalTime(focusTime);

    setMode("focus");
    setIsRunning(false);
    setPaused(true);

    setTimeout(() => {
      setSpinning(false);
    }, 300);
  }

  // -----------------------------
  // Focus Mode
  // -----------------------------

  function handleFocusMode() {
    const focusTime = 25 * 60;

    setRemainingSeconds(focusTime);
    setTotalTime(focusTime);

    setMode("focus");
    setIsRunning(false);
    setPaused(true);
  }

  // -----------------------------
  // Break Mode
  // -----------------------------

  function handleBreakMode() {
    const breakTime = 5 * 60;

    setRemainingSeconds(breakTime);
    setTotalTime(breakTime);

    setMode("break");
    setIsRunning(false);
    setPaused(true);
  }

  // -----------------------------
  // Select Break
  // -----------------------------

  function handleBreak(duration) {
    const breakTime = duration * 60;

    setRemainingSeconds(breakTime);
    setTotalTime(breakTime);

    setMode("break");
    setIsRunning(false);
    setPaused(true);
  }

  // -----------------------------
  // Timer
  // -----------------------------

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          setIsRunning(false);
          setPaused(true);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  return (
    <div className="flex min-h-[calc(70vh-5rem)] flex-col items-center justify-center bg-zinc-50 px-4 py-10 transition-colors duration-300 dark:bg-zinc-950">
      <div className="w-full max-w-lg">
        {/* -------------------------------- */}
        {/* Header */}
        {/* -------------------------------- */}

        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="ibm-mono text-[9px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              {isBreak ? "Break Time" : "Study Mode"}
            </span>
          </div>

          <h1 className="pixel-font text-2xl text-zinc-900 dark:text-white md:text-3xl">
            Pomodoro Timer
          </h1>

          <p className="inter-font mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {isBreak
              ? "Take a break and recharge."
              : "Stay focused. Take breaks. Keep learning."}
          </p>
        </div>

        {/* -------------------------------- */}
        {/* Focus / Break Toggle */}
        {/* -------------------------------- */}

        <div className="mb-5 flex rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {/* Focus */}
          <button
            type="button"
            onClick={handleFocusMode}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all duration-200 ${
              mode === "focus"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Brain className="h-4 w-4" />

            <span>Focus Mode</span>
          </button>

          {/* Break */}
          <button
            type="button"
            onClick={handleBreakMode}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all duration-200 ${
              mode === "break"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Coffee className="h-4 w-4" />

            <span>Break Time</span>
          </button>
        </div>

        {/* -------------------------------- */}
        {/* Break Options */}
        {/* -------------------------------- */}

        {isBreak && (
          <div className="mb-5 grid grid-cols-2 gap-3">
            {/* 5 Minutes */}
            <button
              type="button"
              onClick={() => handleBreak(5)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                totalTime === 5 * 60
                  ? "border-zinc-500 bg-zinc-500/10 text-zinc-600 dark:border-zinc-400 dark:bg-zinc-400/10 dark:text-zinc-400"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-950/30"
              }`}
            >
              <div className="text-sm font-semibold">5 minutes</div>

              <div className="mt-1 text-[10px] text-zinc-400">Short break</div>
            </button>

            {/* 15 Minutes */}
            <button
              type="button"
              onClick={() => handleBreak(15)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                totalTime === 15 * 60
                  ? "border-zinc-500 bg-zinc-500/10 text-zinc-600 dark:border-zinc-400 dark:bg-zinc-400/10 dark:text-zinc-400"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-950/30"
              }`}
            >
              <div className="text-sm font-semibold">15 minutes</div>

              <div className="mt-1 text-[10px] text-zinc-400">Long break</div>
            </button>
          </div>
        )}

        {/* -------------------------------- */}
        {/* Timer Card */}
        {/* -------------------------------- */}

        <div className="relative overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950 md:p-8">
          {/* Background Glow */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500 ${
              isBreak
                ? "bg-sky-500/10 dark:bg-sky-400/10"
                : "bg-emerald-500/5 dark:bg-emerald-400/10"
            }`}
          />

          <div className="relative">
            {/* -------------------------------- */}
            {/* Circular Timer */}
            {/* -------------------------------- */}

            <div className="flex justify-center">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 shadow-inner dark:border-zinc-800 dark:bg-zinc-900 md:h-64 md:w-64">
                {/* Progress Ring */}
                <div className="absolute inset-3">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    {/* Background */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-zinc-200 dark:text-zinc-800"
                    />

                    {/* Progress */}
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className={
                        isBreak
                          ? "text-sky-500 dark:text-sky-400"
                          : "text-emerald-500 dark:text-emerald-400"
                      }
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transition: "stroke-dashoffset 0.5s linear",
                      }}
                    />
                  </svg>
                </div>

                {/* Timer Content */}
                <div className="relative text-center">
                  {minutes > 0 || seconds > 0 ? (
                    <>
                      <p className="ibm-mono text-5xl font-medium tracking-tight text-zinc-900 dark:text-white md:text-6xl">
                        {minutes}:{seconds.toString().padStart(2, "0")}
                      </p>

                      <p
                        className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${
                          isBreak
                            ? "text-sky-500 dark:text-sky-400"
                            : "text-emerald-500 dark:text-emerald-400"
                        }`}
                      >
                        {isBreak ? "Rest time" : "Focus time"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p
                        className={`pixel-font text-xl ${
                          isBreak
                            ? "text-sky-500 dark:text-sky-400"
                            : "text-emerald-500 dark:text-emerald-400"
                        }`}
                      >
                        {isBreak ? "Break Over!" : "Time's Up!"}
                      </p>

                      <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        {isBreak ? "Ready to study?" : "Session complete"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* -------------------------------- */}
            {/* Controls */}
            {/* -------------------------------- */}

            <div className="mt-8 flex items-center justify-center gap-3">
              {/* Play / Pause */}
              {paused ? (
                <button
                  onClick={handleStart}
                  aria-label="Start timer"
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isBreak
                      ? "bg-sky-500 shadow-sky-500/20 hover:bg-sky-600 dark:hover:bg-sky-400"
                      : "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600 dark:hover:bg-emerald-400"
                  }`}
                >
                  <Play className="h-5 w-5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  aria-label="Pause timer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <Pause className="h-5 w-5 fill-current" />
                </button>
              )}

              {/* Reset */}
              <button
                onClick={handleReset}
                aria-label="Reset timer"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-all duration-200 hover:scale-105 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <RotateCcw
                  className={`h-5 w-5 transition-transform duration-500 ${
                    spinning ? "rotate-[500deg]" : ""
                  }`}
                />
              </button>
            </div>

            {/* Labels */}
            <div className="mt-3 flex justify-center gap-7">
              <span className="ibm-mono text-[8px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {paused ? "Start" : "Pause"}
              </span>

              <span className="ibm-mono text-[8px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Reset
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pomodoro;
