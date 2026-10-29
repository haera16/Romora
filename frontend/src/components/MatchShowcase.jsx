import { Check } from "lucide-react";
import MatchCard from "./MatchCard";
import rohan from "../assets/avatars/rohan.svg";

const POINTS = [
  "A plain-English reason for every match",
  "Scores update live as you change your budget",
];

function MatchShowcase() {
  return (
    <section className="bg-slate-100 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Matching that shows its work.</h2>
          <p className="mt-4 max-w-md text-slate-600">
            Romora compares your budget, move-in timing, food preference, furnishing
            and locality with every other student, ranks the people who fit, and
            explains each match in plain words.
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

        <div className="flex flex-col items-center gap-2 md:items-end">
          <MatchCard
            name="Rohan Rai"
            avatar={rohan}
            match={98}
            tagline="Strong fit on budget and move-in"
            subtitle="Computer Science, Year 3 • Patia"
            summary="You both want a semi-furnished place in Patia, prefer veg food and can move in within a month. Your budgets overlap comfortably."
            tags={["Veg", "Semi-furnished", "Within a month"]}
          />
          <p className="text-xs text-slate-500">Example match card</p>
        </div>
      </div>
    </section>
  );
}

export default MatchShowcase;