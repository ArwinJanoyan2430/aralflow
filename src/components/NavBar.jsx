import { useEffect, useRef, useState } from "react";
import { User, ChevronDown, Moon, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Navbar() {
  const [showNavbar, setShowNavbar] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState("User");

  const lastScrollY = useRef(0);

  const [darkMode, setDarkMode] = useState(() => {
    const savedPreference = localStorage.getItem("darkMode");

    if (savedPreference !== null) {
      return savedPreference === "true";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const navigate = useNavigate();

  // Get currently logged-in user's name
  useEffect(() => {
    const getUserName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // The name entered at sign-up is stored in Supabase Auth user metadata.
      // Reading it here avoids relying on a separate public `users` table.
      setUserName(user.user_metadata?.name?.trim() || "User");
    };

    getUserName();
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setShowDropdown(false);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const handleDarkMode = () => {
    setDarkMode((previous) => {
      const next = !previous;
      localStorage.setItem("darkMode", String(next));
      return next;
    });
  };

  // Hide/show navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY.current) {
        setShowNavbar(false);
        setShowDropdown(false);
      } else {
        setShowNavbar(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed top-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 items-center justify-between px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[94%] sm:px-6 md:px-8 lg:px-10 ${
        showNavbar
          ? "translate-y-0 rounded-full border border-zinc-200/70 bg-white/70 shadow-lg shadow-zinc-900/5 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/70 dark:shadow-black/20"
          : "-translate-y-[150%]"
      }`}
    >
      {/* Brand */}
      <Link
        to="/"
        className="font-semibold pixel-font text-zinc-900 dark:text-white"
      >
        AralFlow
      </Link>

      {/* Links */}
      <div className="hidden items-center justify-center gap-5 md:flex lg:gap-6">
        <a
          href="/#how-it-works"
          className="text-xs ibm-mono font-medium  text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          how it works
        </a>

        <a
          href="/#materials"
          className="text-xs ibm-mono font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          library
        </a>

        <a
          href="/#start"
          className="text-xs pixel-font font-light bg-zinc-300 dark:bg-zinc-800 hover:dark:bg-zinc-700 hover:bg-zinc-400 py-1 px-2 rounded-lg text-zinc-600 transition hover:text-zinc-100 dark:text-zinc-400 dark:hover:text-white"
        >
          Upload PDF
        </a>

        <a
          href="/#study-mode"
          className="text-xs ibm-mono font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          study mode
        </a>
        
        <a
          href="/#todo-list"
          className="text-xs ibm-mono font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          to-do
        </a>
      </div>

      {/* User Dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setShowDropdown((previous) => !previous)}
          className="flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/60 px-2.5 py-2 backdrop-blur-md transition hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 sm:px-3"
        >
          <User className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />

          <span className="max-w-32 truncate text-xs md:text-sm lg:text-sm font-medium text-zinc-700 dark:text-zinc-200 sm:block">
            {userName}
          </span>

          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
              showDropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl shadow-zinc-900/10 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-black/30">
            {/* Dark Mode */}
            <button
              type="button"
              onClick={handleDarkMode}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs md:text-sm lg:text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              {darkMode ? (
                <Sun className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Moon className="h-3 w-3 md:h-4 md:w-4" />
              )}

              <span>{darkMode ? "Light mode" : "Dark mode"}</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs md:text-sm lg:text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-red-500 dark:text-zinc-300 dark:hover:bg-zinc-500/10 dark:hover:text-red-500"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
