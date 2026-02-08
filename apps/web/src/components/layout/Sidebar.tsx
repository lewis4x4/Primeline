import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  Target,
  Inbox,
  BarChart3,
  Calculator,
  TrendingUp,
  UserPlus,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/athletes", icon: Users, label: "Athletes" },
  { to: "/brands", icon: Building2, label: "Brands" },
  { to: "/matches", icon: Target, label: "Matches" },
  { to: "/deals", icon: Handshake, label: "Deals" },
  { to: "/digest", icon: Inbox, label: "Action Queue" },
  { to: "/deal-intel", icon: TrendingUp, label: "Deal Intel" },
  { to: "/rate-intel", icon: Calculator, label: "Rate Intel" },
  { to: "/leads", icon: UserPlus, label: "Leads" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-black text-white border-r border-gray-800 h-screen flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <img
          src="/primeline-logo.png"
          alt="PRIMELINE"
          className="h-10 w-auto invert"
        />
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm rounded-none transition-colors ${
                isActive
                  ? "bg-white text-black font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
