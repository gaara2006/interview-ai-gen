import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaMicrophone,
  FaFileAlt,
  FaChartLine,
  FaCog,
  FaHistory,
} from "react-icons/fa";

const Sidebar = () => {
  const menu = [
  { name: "Dashboard", path: "/dashboard", icon: <FaHome /> },
  { name: "AI Interview", path: "/interview", icon: <FaMicrophone /> },
  { name: "Resume Review", path: "/resume", icon: <FaFileAlt /> },
  { name: "Progress", path: "/progress", icon: <FaChartLine /> },
  { name: "Settings", path: "/settings", icon: <FaCog /> },
  { name: "Interview History", path: "/history", icon: <FaHistory /> },
];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="text-2xl font-bold text-blue-500 p-6">
        InterviewAI
      </div>

      <nav className="flex-1 px-3">
        {menu.map((item) => (
        <NavLink
        key={item.name}
        to={item.path}
        className={({ isActive }) =>
        `flex items-center gap-4 p-3 rounded-xl mb-2 transition ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-slate-300 hover:bg-slate-800"
        }`
        }
        >
        <span>{item.icon}</span>
        <span>{item.name}</span>
        </NavLink>
        ))}
      </nav>

      <div className="p-4 text-sm text-slate-500 border-t border-slate-800">
        Version 1.0
      </div>
      
    </aside>
  );
};

export default Sidebar;