// These are facts about how Romora works, not user counts, so they stay true on any day.
const STATS = [
  { value: "KIIT only", label: "Closed community", text: "Sign-up needs a KIIT email and a matching ID card" },
  { value: "Live", label: "Match scores", text: "Scores update as you change your budget" },
  { value: "Real-time", label: "Messages", text: "Chat opens once you both say hello" },
];

function StatsRow() {
  return (
    <section className="py-14">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
          >
            <p className="text-3xl font-bold text-green-800">{stat.value}</p>
            <p className="mt-1 font-medium text-slate-900">{stat.label}</p>
            <p className="mt-1 text-xs text-slate-400">{stat.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StatsRow;