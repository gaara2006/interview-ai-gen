import { useEffect, useState } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const refreshUser = () => setUser(readStoredUser());
    window.addEventListener("storage", refreshUser);
    window.addEventListener("interviewai-user-updated", refreshUser);
    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("interviewai-user-updated", refreshUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("interviewai-user-updated"));
    navigate("/", { replace: true });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <header className="bg-slate-950 border-b border-slate-800 min-h-20 flex items-center justify-between gap-4 px-4 sm:px-8 py-3">
      <div>
        <h2 className="text-xl font-bold">{greeting} 👋</h2>
        <p className="text-slate-400 text-sm">Welcome back, {user?.name || "there"}</p>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <FaBell className="text-lg text-slate-300" aria-label="Notifications" />
        <FaUserCircle className="text-3xl text-blue-400" aria-hidden="true" />
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
        >
          Log out
        </button>
      </div>
    </header>
  );
};

export default Navbar;
