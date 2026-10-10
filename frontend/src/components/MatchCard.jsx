import { Zap, Sparkles, ChevronDown, BadgeCheck } from "lucide-react";

function MatchCard({ name, avatar, match, tagline, subtitle, summary, tags }) {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
      <div className="flex items-start justify-between">
        <div className="relative">
          <img
            src={avatar}
            alt=""
            className="h-20 w-20 rounded-xl bg-sky-100 object-cover object-top"
          />
          <BadgeCheck className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-white text-green-600" />
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            <Zap className="h-3 w-3" />
            {match}% Match
          </span>
          <p className="mt-2 flex items-center justify-end gap-1 text-xs text-slate-500">
            Why? <ChevronDown className="h-3 w-3" />
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold text-slate-900">{name}</h3>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
          {tagline}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>

      <p className="mt-4 flex items-center gap-1 text-xs font-semibold tracking-wide text-green-700">
        <Sparkles className="h-3 w-3" />
        AI SUMMARY
      </p>
      <p className="mt-2 rounded-xl bg-indigo-50 p-4 text-sm italic text-slate-600">
        “{summary}”
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-full bg-green-700 py-3 font-semibold text-white hover:bg-green-800"
      >
        Say Hello
      </button>
    </div>
  );
}

export default MatchCard;