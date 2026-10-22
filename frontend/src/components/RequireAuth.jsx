import { Navigate } from "react-router-dom";
import useSession from "../hooks/useSession";
import LogoutButton from "./LogoutButton";

function RequireAuth({ children }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <LogoutButton />
      </div>
      {children}
    </>
  );
}

export default RequireAuth;