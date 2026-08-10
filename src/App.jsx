import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PracticeExam from "./pages/PracticeExam";

import { supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
      }

      setSession(data.session);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="pixel-font text-sm">Loading AralFlow...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          }
        />

        {/* Signup */}
        <Route
          path="/signup"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Signup />
            )
          }
        />

        {/* Home */}
        <Route
          path="/"
          element={
            session ? (
              <Home />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Practice Exam */}
        <Route
          path="/practice-exam"
          element={
            session ? (
              <PracticeExam />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Anything unknown */}
        <Route
          path="*"
          element={<Navigate to={session ? "/" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;