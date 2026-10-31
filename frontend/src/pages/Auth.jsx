import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SignUpForm from "../components/auth/SignUpForm";
import LoginForm from "../components/auth/LoginForm";
import diamond from "../assets/romora_diamond.svg";

const FACE =
  "card-face flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft-card";

function Auth() {
  const { pathname } = useLocation();
  const [showLogin, setShowLogin] = useState(pathname === "/login");

  useEffect(() => {
    setShowLogin(pathname === "/login");
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-100 to-white px-6 py-6">
      <header className="mx-auto flex w-full max-w-6xl items-center">
        <Link to="/" className="flex items-center gap-2">
          <img src={diamond} alt="" className="h-8" />
          <span className="font-heading text-2xl font-extrabold tracking-tight text-romora-500">
            Romora
          </span>
          <span className="ml-1 hidden rounded-full border border-romora-200 bg-romora-100 px-2 py-0.5 text-[11px] font-semibold text-romora-600 sm:inline-block">
            KIIT Verified
          </span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="perspective-1000 w-full max-w-[440px]">
          <div className={`card-flipper ${showLogin ? "flipped" : ""}`}>
            <div
              className={`${FACE} ${showLogin ? "pointer-events-none" : ""}`}
              aria-hidden={showLogin}
            >
              <SignUpForm />
            </div>

            <div
              className={`${FACE} card-face-back ${showLogin ? "" : "pointer-events-none"}`}
              aria-hidden={!showLogin}
            >
              <LoginForm />
            </div>
          </div>
        </div>

        <p className="mt-4 w-full max-w-[440px] text-right text-sm text-slate-500">
          {showLogin ? "New here? " : "Already a user? "}
          <button
            type="button"
            onClick={() => setShowLogin(!showLogin)}
            className="font-semibold text-romora-500 underline hover:text-romora-600"
          >
            {showLogin ? "Sign up" : "Log in"}
          </button>
        </p>

        <p className="mt-2 w-full max-w-[440px] text-right text-xs text-slate-400">
          <Link to="/privacy" className="underline hover:text-slate-600">
            Privacy notice
          </Link>
        </p>
      </main>
    </div>
  );
}

export default Auth;