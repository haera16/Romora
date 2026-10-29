import { useState } from "react";
import {
  Mail, Lock, Eye, EyeOff, User, ShieldCheck, Info, CircleAlert, ArrowRight,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import IdUpload from "./IdUpload";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const STRENGTH_LABELS = ["Strength", "Weak", "Medium", "Strong"];
const STRENGTH_COLORS = ["bg-slate-200", "bg-rose-500", "bg-amber-400", "bg-emerald-500"];

const INPUT =
  "w-full rounded-xl border bg-white py-2.5 pl-10 text-sm text-slate-800 placeholder-slate-400 transition focus:outline-none focus:ring-2";
const INPUT_OK = "border-slate-200 focus:border-romora-500 focus:ring-romora-500/20";
const INPUT_BAD = "border-rose-400 bg-rose-50/20 focus:border-rose-400 focus:ring-rose-200";
const LABEL = "mb-1 block font-heading text-xs font-semibold text-slate-700";

function getStrength(pw) {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(score, 1);
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(""); // "", "verifying", "creating"

  const isKiitEmail = /^\d+@kiit\.ac\.in$/.test(email.trim().toLowerCase());
  const emailBad = emailTouched && email.length > 0 && !isKiitEmail;
  const strength = getStrength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isKiitEmail) return setError("Please use your valid @kiit.ac.in email address");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (!username.trim()) return setError("Please choose a username");
    if (!gender) return setError("Please choose a gender option");
    if (!idFile) return setError("Please upload your KIIT ID card");
    if (!["image/jpeg", "image/png"].includes(idFile.type)) {
      return setError("To verify your ID, please upload a JPG or PNG photo (not a PDF).");
    }

    setLoading(true);

    // Step 1: check the ID card against the email's roll number
    try {
      setStage("verifying");
      const form = new FormData();
      form.append("email", email.trim());
      form.append("file", idFile);

      const res = await fetch(`${API_URL}/verify-id-signup`, { method: "POST", body: form });
      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoading(false);
        setStage("");
        return setError(out.detail || "Could not verify your ID. Please try again.");
      }
      if (!out.verified) {
        setLoading(false);
        setStage("");
        return setError(
          "We could not match the roll number on your ID with your email. Upload a clear, well-lit photo of your own KIIT ID."
        );
      }
    } catch {
      setLoading(false);
      setStage("");
      return setError("Could not reach the verification service. Please try again in a moment.");
    }

    // Step 2: ID matched, so create the account
    setStage("creating");
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim(), gender } },
    });

    setLoading(false);
    setStage("");

    if (signUpError) setError(signUpError.message);
    else setMessage("ID verified. Account created! Check your KIIT email to confirm it, then log in.");
  }

  const buttonText =
    stage === "verifying" ? "Verifying your ID..." : stage === "creating" ? "Creating account..." : "Create account";

  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-romora-500 px-5 py-2.5 text-xs font-semibold tracking-wide text-white">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
        <span className="truncate">Sign up with your KIIT email ID only</span>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="mb-5 text-center">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-800">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Find a roommate you will actually get along with.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col space-y-3.5">
          {/* Email */}
          <div>
            <label htmlFor="signup-email" className={LABEL}>KIIT Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="yourrollno@kiit.ac.in"
                className={`${INPUT} pr-4 ${emailBad ? INPUT_BAD : INPUT_OK}`}
              />
            </div>
            {emailBad ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                Please use your valid @kiit.ac.in email address
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                <Info className="h-3 w-3 shrink-0 text-romora-500" />
                Only @kiit.ac.in addresses are accepted
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="signup-password" className={LABEL}>Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className={`${INPUT} ${INPUT_OK} pr-10`}
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
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-full flex-1 rounded-full transition-colors duration-300 ${n <= strength ? STRENGTH_COLORS[strength] : "bg-slate-200"
                      }`}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-[10px] font-medium text-slate-500">
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="signup-username" className={LABEL}>Username</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username (e.g. arnav_kiit)"
                className={`${INPUT} ${INPUT_OK} pr-4`}
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <span className={LABEL}>Gender</span>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200/60 bg-slate-100/90 p-1">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
                  className={`truncate rounded-lg px-2 py-1.5 text-center font-heading text-xs font-semibold transition ${gender === g.value
                    ? "bg-romora-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* ID upload */}
          <IdUpload file={idFile} onChange={setIdFile} />

          {/* Submit area */}
          <div className="mt-auto space-y-2 pt-2">
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
              className="flex w-full items-center justify-center gap-2 rounded-full bg-romora-500 px-5 py-3 font-heading text-sm font-bold text-white shadow-md transition hover:bg-romora-600 disabled:opacity-60"
            >
              {buttonText}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="text-center text-[10px] text-slate-400">
              By signing up you agree to sharing your college credentials with us.
            </p>
          </div>
        </form>
      </div>
    </>
  );
}

export default SignUpForm;