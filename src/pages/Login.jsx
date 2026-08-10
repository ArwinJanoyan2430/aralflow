import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Form from "../components/Form";

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
        <p className="inter-font mt-4 text-center text-xs text-zinc-500">
          Dont have an account?{" "}
          <button
            type="button"
            onClick={handleSignup}
            className="ibm-mono cursor-pointer text-xs text-zinc-800 hover:text-zinc-500"
          >
            Sign up here
          </button>
        </p>
      }
    >
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

      <div className="mb-4">
        <label className="ibm-mono mb-2 block text-xs font-medium text-zinc-700">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          className="inter-font w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500"
        />
      </div>
    </Form>
  );
}

export default Login;

