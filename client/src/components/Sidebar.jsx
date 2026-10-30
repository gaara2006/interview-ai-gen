import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaChartLine,
  FaBars,
  FaCog,
  FaFileAlt,
  FaGraduationCap,
  FaHistory,
  FaHome,
  FaMicrophone,
  FaArrowRight,
} from "react-icons/fa";

const menu = [
  { name: "Dashboard", path: "/dashboard", icon: <FaHome /> },
  { name: "AI Interview", path: "/interview", icon: <FaMicrophone /> },
  { name: "Resume Review", path: "/resume", icon: <FaFileAlt /> },
  { name: "Progress", path: "/progress", icon: <FaChartLine /> },
  { name: "Interview History", path: "/history", icon: <FaHistory /> },
  { name: "Settings", path: "/settings", icon: <FaCog /> },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.07] bg-[#08080e] lg:sticky lg:top-0 lg:h-dvh lg:w-[258px] lg:border-b-0 lg:border-r">
      <div className="relative flex items-center gap-3 px-4 py-4 sm:px-6 lg:py-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/10 text-violet-200 ring-1 ring-inset ring-violet-300/20 shadow-lg shadow-violet-950/20">
          <FaMicrophone size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-white">Interview<span className="text-violet-300">AI</span></p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">Career practice</p>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-sidebar-navigation"
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-violet-300/30 hover:bg-white/[0.05] hover:text-white lg:hidden"
        >
          <FaBars aria-hidden="true" />
          {isMobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      <nav id="mobile-sidebar-navigation" aria-label="Main navigation" className={`${isMobileMenuOpen ? "grid" : "hidden"} grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-col lg:gap-2 lg:overflow-x-visible lg:overflow-y-auto lg:px-4 lg:pb-4`}>
        <p className="hidden px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 lg:block">Workspace</p>
        {menu.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex min-w-0 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition duration-200 lg:mx-0 ${
                isActive
                  ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-950/35 ring-1 ring-inset ring-white/10"
                  : "text-zinc-400 hover:bg-white/[0.045] hover:text-white"
              }`
            }
          >
            <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="hidden px-4 pb-4 lg:block">
        <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-[#24163e] via-[#171326] to-[#11111b] p-4">
          <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-violet-500/15 blur-2xl" />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><FaGraduationCap size={18} /></div>
          <p className="relative mt-3 text-sm font-semibold text-white">Build interview confidence</p>
          <p className="relative mt-1 text-xs leading-5 text-zinc-400">Short, consistent practice can help you prepare with purpose.</p>
          <button type="button" onClick={() => navigate("/interview")} className="relative mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25">Start practicing <FaArrowRight size={10} /></button>
        </div>
        <div className="mt-4 border-t border-white/[0.06] px-2 pt-4 text-[11px] text-zinc-600">InterviewAI · Version 1.0</div>
      </div>
    </aside>
  );
};

export default Sidebar;
