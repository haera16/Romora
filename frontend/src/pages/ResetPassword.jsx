import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck, CircleAlert } from "lucide-react";
import { supabase } from "../supabaseClient";
import diamond from "../assets/romora_diamond.svg";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-romora-500 focus:outline-none focus:ring-2 focus:ring-romora-500/20";
const LABEL = "mb-1 block font-heading text-xs font-semibold text-slate-700";

function ResetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("The two passwords do not match");

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      return setError(updateError.message);
    }

    setMessage("Password updated! Taking you to log in...");
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 1500);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-100 to-white px-6 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2">
        <img src={diamond} alt="" className="h-8" />
        <span className="font-heading text-2xl font-extrabold tracking-tight text-romora-500">
          Romora
        </span>
      </Link>

      <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft-card">
        <div className="flex items-center justify-center gap-2 bg-romora-500 px-5 py-2.5 text-xs font-semibold tracking-wide text-white">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
          <span>Choose a new password</span>
        </div>

        <div className="p-6 sm:p-7">
          {checking && <p className="text-center text-sm text-slate-500">Checking your link...</p>}

          {!checking && !ready && (
            <div className="text-center">
              <p className="text-sm text-slate-600">
                This reset link is missing or has expired. Request a new one from the log in page.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block rounded-full bg-romora-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-romora-600"
              >
                Back to log in
              </Link>
            </div>
          )}

          {!checking && ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className={LABEL}>New password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={INPUT}
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
              </div>

              <div>
                <label htmlFor="confirm-password" className={LABEL}>Confirm password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    className={INPUT}
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-1 text-xs font-medium text-rose-600">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              {message && <p className="text-xs font-medium text-emerald-700">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-romora-500 px-5 py-3 font-heading text-sm font-bold text-white shadow-md transition hover:bg-romora-600 disabled:opacity-60"
              >
                {loading ? "Saving..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;