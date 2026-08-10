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

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
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

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Email confirmation is disabled
    if (data.session) {
      navigate("/");
      return;
    }

    // Email confirmation is enabled
    setError(
      "Account created! Please check your email to verify your account.",
    );
  };

  return (
    <Form
      onSubmit={handleSubmit}
      title="Create your account"
      buttonText={loading ? "Creating account..." : "Create account"}
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
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500"
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
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500"
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
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500"
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
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500"
        />
      </div>

      {/* Login link */}
      <p className="ibm-mono text-center text-xs text-zinc-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="font-medium text-zinc-900 transition hover:text-zinc-500"
        >
          Sign in here
        </button>
      </p>
    </Form>
  );
}

export default Signup;
