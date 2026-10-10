import { User, Heart, MessageCircle } from "lucide-react";

const STEPS = [
  {
    icon: User,
    bg: "bg-emerald-100",
    title: "1. Create your profile",
    text: "Tell us about your sleep cycle, study habits, and if you can cook!",
  },
  {
    icon: Heart,
    bg: "bg-amber-100",
    title: "2. Get matched",
    text: "Our AI finds roommates with similar lifestyles and shared interests.",
  },
  {
    icon: MessageCircle,
    bg: "bg-rose-100",
    title: "3. Connect safely",
    text: "Once you both like each other, you can share contact details and plan a meetup.",
  },
];

function HowItWorks() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Finding a home made simple
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, bg, title, text }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${bg}`}>
                <Icon className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 max-w-xs text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;