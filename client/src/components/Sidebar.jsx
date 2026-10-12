import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaMicrophone,
  FaFileAlt,
  FaChartLine,
  FaCog,
  FaHistory,
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
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800 bg-zinc-950 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:py-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
          <FaMicrophone size={17} aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-white">Interview<span className="text-violet-300">AI</span></p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Career practice</p>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-4">
        {menu.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:mx-1 ${
                isActive
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/20"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`
            }
          >
            <span className="text-base" aria-hidden="true">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-zinc-800 px-6 py-4 text-xs text-zinc-600 lg:block">
        InterviewAI · Version 1.0
      </div>
    </aside>
  );
};

export default Sidebar;
