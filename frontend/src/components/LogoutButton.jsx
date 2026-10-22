import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function LogoutButton({ redirectTo = "/login", className = "" }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate(redirectTo, { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 ${className}`}
    >
      Log out
    </button>
  );
}

export default LogoutButton;