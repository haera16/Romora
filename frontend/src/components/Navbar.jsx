import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-bold text-green-800">
          Romora
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Sign up
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Log in
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;