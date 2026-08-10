import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Form from "../components/Form";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // -----------------------------
    // Validation
    // -----------------------------

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // -----------------------------
      // Create Supabase Auth account
      // -----------------------------

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
            },
          },
        });

      console.log("Signup data:", data);
      console.log("Signup error:", signupError);

      // -----------------------------
      // Signup error
      // -----------------------------

      if (signupError) {
        const message = signupError.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("user already registered") ||
          message.includes("email already") ||
          message.includes("already been registered")
        ) {
          setError(
            "This email is already registered. Please sign in or use a different email.",
          );
        } else {
          setError(signupError.message);
        }

        return;
      }

      // -----------------------------
      // Account created successfully
      // -----------------------------

      if (data?.user) {
        // If Supabase returned a session,
        // the user is already logged in.
        if (data.session) {
          navigate("/", { replace: true });
          return;
        }

        // No session means email confirmation
        // is still enabled in Supabase.
        setError(
          "Account created, but email confirmation is still enabled in Supabase. Disable email confirmation in your Supabase Authentication settings.",
        );

        return;
      }

      setError("Account could not be created. Please try again.");
    } catch (err) {
      console.error("Signup exception:", err);

      setError(
        "Something went wrong while creating your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      onSubmit={handleSubmit}
      title="Create your account"
      buttonText={loading ? "Creating account..." : "Create account"}
      loading={loading}
      error={error}
    >
      {/* Name */}
      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700">
          Name
        </label>

        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Arwin Janoyan"
          disabled={loading}
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@example.com"
          disabled={loading}
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Password */}
      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          disabled={loading}
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Confirm Password */}
      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700">
          Confirm Password
        </label>

        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm your password"
          disabled={loading}
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Login link */}
      <p className="ibm-mono text-center text-xs text-zinc-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          disabled={loading}
          className="font-medium text-zinc-900 transition hover:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Login here
        </button>
      </p>
    </Form>
  );
}

export default Signup;