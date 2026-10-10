import { Check } from "lucide-react";
import MatchCard from "./MatchCard";
import rohan from "../assets/avatars/rohan.svg";

const POINTS = ["Compatibility deep-dive", "Reasons behind every match"];

function MatchShowcase() {
  return (
    <section className="bg-slate-100 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Science-backed matching.</h2>
          <p className="mt-4 max-w-md text-slate-600">
            Our Match-O-Meter does not just look at budgets. It compares noise tolerance,
            cleanliness, sleep schedule and social energy to find people you will actually
            live well with.
          </p>

          <ul className="mt-6 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-700">
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center md:justify-end">
          <MatchCard
            name="Rohan Rai"
            avatar={rohan}
            match={98}
            tagline="Quiet & Focused"
            subtitle="Computer Science, Year 3 • Patia"
            summary="Rohan shares your love for morning coffee runs and late-night coding sessions. He prefers a quiet environment after 10 PM, just like you!"
            tags={["Early Bird", "Loves Cats", "+3 more"]}
          />
        </div>
      </div>
    </section>
  );
}

export default MatchShowcase;