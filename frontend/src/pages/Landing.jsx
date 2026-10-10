import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import HeroMatchStrip from "../components/HeroMatchStrip";
import TrustStrip from "../components/TrustStrip";
import HowItWorks from "../components/HowItWorks";
import MatchShowcase from "../components/MatchShowcase";
import StatsRow from "../components/StatsRow";
import FAQ from "../components/FAQ";
import FinalCTA from "../components/FinalCTA";

function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            Find your KIIT roommate, <span className="text-green-700">safely.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Connect with verified KIIT students who share your habits, vibe, and study
            schedule. No more awkward rooming situations.
          </p>

          <div className="mt-8">
            <Link
              to="/signup"
              className="inline-block rounded-full bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
            >
              Get started
            </Link>
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-slate-600">
            <CircleCheck className="h-4 w-4 text-green-700" />
            Verified KIIT students only.
          </p>
        </div>

        <HeroMatchStrip />
      </section>

      <TrustStrip />
      <HowItWorks />
      <MatchShowcase />
      <StatsRow />
      <FAQ />
      <FinalCTA />
    </div>
  );
}

export default Landing;