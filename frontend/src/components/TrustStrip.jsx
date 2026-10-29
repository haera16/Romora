import { Mail, ShieldCheck, Bell } from "lucide-react";

const ITEMS = [
  { icon: Mail, title: "KIIT email only", text: "Sign-up needs a KIIT email address" },
  { icon: ShieldCheck, title: "ID checked at sign-up", text: "Your ID roll number must match your email" },
  { icon: Bell, title: "Report anytime", text: "Repeated reports hide a profile automatically" },
];

function TrustStrip() {
  return (
    <section className="bg-indigo-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 md:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
              <Icon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TrustStrip;