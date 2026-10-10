// DEMO NUMBERS: replace these with real counts before you present or deploy.
const STATS = [
  { value: "1,200+", label: "Active seekers", text: "Looking for a home right now" },
  { value: "450+", label: "Verified listings", text: "All student-approved rooms" },
  { value: "800+", label: "Matches made", text: "Connections created this semester" },
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