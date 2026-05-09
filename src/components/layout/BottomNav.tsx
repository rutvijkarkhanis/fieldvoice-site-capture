import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, Plus, CalendarClock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/leads", icon: ListChecks, label: "Leads" },
  { to: "/add", icon: Plus, label: "Add", primary: true },
  { to: "/followups", icon: CalendarClock, label: "Follow-Ups" },
  { to: "/map", icon: MapPin, label: "Map" },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-card safe-bottom">
      <ul className="grid grid-cols-5 max-w-xl mx-auto">
        {tabs.map((t) => {
          const active = path === t.to || (t.to !== "/" && path.startsWith(t.to));
          if (t.primary) {
            return (
              <li key={t.to} className="flex justify-center -mt-6">
                <Link to={t.to} className="flex flex-col items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                  <t.icon className="h-7 w-7" />
                </Link>
              </li>
            );
          }
          return (
            <li key={t.to}>
              <Link to={t.to} className={cn("flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold uppercase tracking-wide", active ? "text-primary" : "text-muted-foreground")}>
                <t.icon className="h-5 w-5" />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}