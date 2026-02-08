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
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
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
    <aside className="w-56 border-r border-border bg-background h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="font-sans font-semibold text-lg tracking-tight">
          SCOUT
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors",
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
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
