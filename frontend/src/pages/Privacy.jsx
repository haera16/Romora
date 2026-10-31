import { Link } from "react-router-dom";
import diamond from "../assets/romora_diamond.svg";

// Replace with the address students should write to for deletion requests.
const CONTACT = "23052145@kiit.ac.in";

const SECTIONS = [
  {
    title: "About this project",
    body: "Romora is a student project built at KIIT University to help students find compatible roommates. It is not a commercial service.",
  },
  {
    title: "What we collect",
    body: "Your KIIT email (your roll number is the part before @kiit.ac.in), name, username, gender, year, branch, an optional short bio, your housing preferences, the people you say hello to, your messages, and any reports you file.",
  },
  {
    title: "Your ID card",
    body: "When you sign up, the photo of your ID card is read once to check that the roll number on it matches your email. Romora does not store the image. To read it, the image is sent to Groq, an AI service, and is processed under Groq's own terms. Only the verified roll number is kept, so we can show the Verified badge.",
  },
  {
    title: "How matching works",
    body: "Your preferences and your bio are compared with other students' to score matches. Your bio is turned into numbers on our own server for this and is not sent anywhere else. To write the short \"why you match\" sentence, we send Groq only the match facts, never names, emails or bios.",
  },
  {
    title: "Who can see what",
    body: "Logged-in students can see your name, branch, year, preferences and bio. Your roll number and email are not shown to other students, and we never share phone numbers or email addresses. Messages can be read only by you and the person you are chatting with, and chat opens only when you both say hello. The project admin has database access and can look at stored data when reviewing a report.",
  },
  {
    title: "Reports",
    body: "Reports are saved for the admin to review.",
  },
  {
    title: "Deleting your data",
    body: `To delete your account and everything linked to it, write to ${CONTACT}.`,
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={diamond} alt="" className="h-8" />
          <span className="font-heading text-2xl font-extrabold tracking-tight text-romora-500">Romora</span>
        </Link>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft-card sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900">Privacy notice</h1>
          <div className="mt-6 space-y-6">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy;