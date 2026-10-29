import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Why do I need to verify my KIIT ID?",
    a: "To keep Romora limited to real KIIT students. At sign-up we read the roll number on your ID card and check that it matches your KIIT email. Your ID image is used only for this check and is not stored by Romora.",
  },
  {
    q: "Can I control who sees my profile?",
    a: "Profiles are visible only to logged-in KIIT students. You choose who to say hello to, and you can only chat with people who said hello back. We never share phone numbers or email addresses.",
  },
  {
    q: "What happens if I report someone?",
    a: "Your report is saved for an admin to review. If a profile is reported by three different students, it is hidden from Explore and Messages until an admin has looked at it.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-16">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Frequently Asked Questions
        </h2>

        <div className="mt-10 space-y-4">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.q}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 text-left text-sm font-semibold text-slate-900"
                >
                  {item.q}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-green-700 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                >
                  <div className="overflow-hidden">
                    <p className="pt-3 text-sm text-slate-600">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQ;