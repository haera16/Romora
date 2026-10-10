import { Link } from "react-router-dom";

function FinalCTA() {
  return (
    <section className="px-6 py-20 text-center">
      <h2 className="mx-auto max-w-md text-4xl font-bold text-slate-900">
        Ready to find your next home?
      </h2>
      <Link
        to="/signup"
        className="mt-8 inline-block rounded-full bg-green-700 px-8 py-3 font-semibold text-white shadow-lg hover:bg-green-800"
      >
        Get started
      </Link>
      <p className="mt-4 text-sm text-slate-500">Only verified KIIT students can join</p>
    </section>
  );
}

export default FinalCTA;