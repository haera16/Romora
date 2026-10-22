import { Link } from "react-router-dom";
import useSession from "../hooks/useSession";
import LogoutButton from "./LogoutButton";

const BUTTON =
  "rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800";

function Navbar() {
  const { session, loading } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-bold text-green-800">
          Romora
        </Link>

        <div className="flex items-center gap-3">
          {!loading && !session && (
            <>
              <Link to="/signup" className={BUTTON}>
                Sign up
              </Link>
              <Link to="/login" className={BUTTON}>
                Log in
              </Link>
            </>
          )}

          {!loading && session && (
            <>
              <Link to="/create-profile" className={BUTTON}>
                My profile
              </Link>
              <LogoutButton redirectTo="/" />
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;