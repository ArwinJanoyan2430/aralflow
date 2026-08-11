import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Form from "../components/Form";
import toast from "react-hot-toast";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setIsSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsSigningIn(false);
      return;
    }

    // Tell UpdateNotice to show after login
    sessionStorage.setItem("show-update-notice", "true");

    navigate("/");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  return (
    <Form
      onSubmit={handleSubmit}
      buttonText={isSigningIn ? "Signing in..." : "Sign in"}
      error={error}
      footer={
        <p className="inter-font mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Dont have an account?{" "}
          <button
            type="button"
            onClick={handleSignup}
            className="ibm-mono cursor-pointer text-xs text-zinc-800 hover:text-zinc-500 dark:text-zinc-200 dark:hover:text-zinc-400"
          >
            Sign up here
          </button>
        </p>
      }
    >
      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@example.com"
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
        />
      </div>

      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
        />
      </div>
    </Form>
  );
}

export default Login;
