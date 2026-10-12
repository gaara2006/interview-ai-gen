import { useEffect, useState } from "react";
import { FaSearch, FaUserCircle, FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const SEARCH_TARGETS = [
  { terms: ["dashboard", "overview", "home"], path: "/dashboard" },
  { terms: ["interview", "practice", "hr", "technical", "communication"], path: "/interview" },
  { terms: ["resume", "cv"], path: "/resume" },
  { terms: ["progress", "score", "analytics"], path: "/progress" },
  { terms: ["history", "previous", "past sessions"], path: "/history" },
  { terms: ["settings", "profile", "account"], path: "/settings" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredUser);
  const [search, setSearch] = useState("");
  const [searchMessage, setSearchMessage] = useState("");

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

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim().toLowerCase();
    if (!query) return;
    const target = SEARCH_TARGETS.find((item) => item.terms.some((term) => term.includes(query) || query.includes(term)));
    if (target) {
      setSearchMessage("");
      setSearch("");
      navigate(target.path);
    } else {
      setSearchMessage("Try dashboard, interview, resume, progress, or history.");
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const userName = user?.name || "there";
  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="relative z-10 flex min-h-[82px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] bg-[#08080e]/95 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-8">
      <div className="min-w-[180px]">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-[22px]">{greeting} <span aria-hidden="true">👋</span></h2>
        <p className="mt-1 text-sm text-zinc-500">Welcome back, <span className="text-zinc-300">{userName}</span></p>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
        <form onSubmit={handleSearch} className="relative hidden w-full max-w-[310px] md:block">
          <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setSearchMessage(""); }} aria-label="Search sections" placeholder="Search dashboard, practice…" className="h-10 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/40 focus:bg-white/[0.04]" />
          <button type="submit" aria-label="Go to search result" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/10 hover:text-white"><FaArrowRight size={10} /></button>
          {searchMessage && <p role="status" className="absolute right-0 top-12 z-20 w-72 rounded-lg border border-white/10 bg-[#171722] p-3 text-xs leading-5 text-zinc-300 shadow-xl">{searchMessage}</p>}
        </form>

        <div className="flex items-center gap-3 border-l border-white/[0.08] pl-3 sm:gap-4 sm:pl-4">
          <div className="hidden text-right sm:block"><p className="max-w-32 truncate text-xs font-semibold text-zinc-200">{userName}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-zinc-600">Candidate</p></div>
          <div title={userName} aria-label={`Signed in as ${userName}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-violet-950/25">{initial || <FaUserCircle />}</div>
          <button type="button" onClick={handleLogout} className="rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white sm:px-4 sm:text-sm">Log out</button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
