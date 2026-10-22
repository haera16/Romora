import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, CircleAlert, ArrowRight } from "lucide-react";
import { supabase } from "../../supabaseClient";
import diamond from "../../assets/romora_diamond.svg";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-romora-500 focus:outline-none focus:ring-2 focus:ring-romora-500/20";
const LABEL = "mb-1 block font-heading text-xs font-semibold text-slate-700";
const SUBMIT =
  "flex w-full items-center justify-center gap-2 rounded-full bg-romora-500 px-5 py-3 font-heading text-sm font-bold text-white shadow-md transition hover:bg-romora-600 disabled:opacity-60";

function LoginForm() {
  const [mode, setMode] = useState("login"); // "login" or "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function switchMode(next) {
    setMode(next);
    setError("");
    setMessage("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (loginError) setError(loginError.message);
    else navigate("/create-profile");
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) return setError("Please enter your KIIT email");

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) setError(resetError.message);
    else
      setMessage(
        "If an account exists for this email, a reset link is on its way. Check your inbox and spam folder."
      );
  }

  const isForgot = mode === "forgot";

  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-romora-500 px-5 py-2.5 text-xs font-semibold tracking-wide text-white">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
        <span className="truncate">
          {isForgot ? "Reset your password" : "Log in with your KIIT email ID"}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center p-6 sm:p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-romora-50">
            <img src={diamond} alt="" className="h-6" />
          </div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-800">
            {isForgot ? "Forgot your password?" : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isForgot
              ? "Enter your KIIT email and we will send you a reset link."
              : "Log in with your KIIT email."}
          </p>
        </div>

        <form onSubmit={isForgot ? handleForgot : handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className={LABEL}>KIIT Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourrollno@kiit.ac.in"
                className={INPUT}
              />
            </div>
          </div>

          {!isForgot && (
            <div>
              <label htmlFor="login-password" className={LABEL}>Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${INPUT} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs font-semibold text-romora-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1 text-xs font-medium text-rose-600">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          {message && <p className="text-xs font-medium text-emerald-700">{message}</p>}

          <button type="submit" disabled={loading} className={SUBMIT}>
            {isForgot
              ? loading ? "Sending..." : "Send reset link"
              : loading ? "Logging in..." : "Log in"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          {isForgot && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Back to log in
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-400">Romora • for KIIT students</p>
      </div>
    </>
  );
}

export default LoginForm;