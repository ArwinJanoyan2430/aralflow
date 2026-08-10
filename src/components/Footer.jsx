function Footer() {
  return (
    <footer className="bg-white dark:bg-zinc-950">
      {/* Footer Content */}
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          {/* Brand */}
          <div>
            <h2 className="pixel-font text-sm tracking-wider text-zinc-900 dark:text-white">
              AralFlow
            </h2>

            <p className="inter-font mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Study smarter. Practice better.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <a
              href="#how-it-works"
              className="inter-font text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              How it works
            </a>

            <a
              href="#features"
              className="inter-font text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Features
            </a>

            <a
              href="#start"
              className="inter-font text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Get started
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6 py-5 text-center sm:px-8 sm:text-left">
          <p className="inter-font text-xs text-zinc-400 dark:text-zinc-500">
            © {new Date().getFullYear()} AralFlow. All rights reserved. Made
            by{" "}
            <span className="text-zinc-600 dark:text-zinc-300">
              Arwin Janoyan
            </span>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;