import { Link } from "react-router-dom";
import HeroMatchStrip from "../components/HeroMatchStrip";

function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            Find your KIIT roommate, <span className="text-green-700">safely.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Connect with verified KIIT students who share your habits, vibe, and study
            schedule. No more awkward rooming situations.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              to="/signup"
              className="rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
            >
              Get started
            </Link>
            <Link to="/login" className="text-slate-700 underline">
              Log in
            </Link>
          </div>
        </div>

        <HeroMatchStrip />
      </section>
    </div>
  );
}

export default Landing;