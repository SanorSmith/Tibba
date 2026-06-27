"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Stethoscope,
  Activity,
  ClipboardList,
  Pill,
  Clock,
  Users,
  FileText,
  AlertCircle,
  HandHelping,
  Droplets,
  Frown,
  Bandage,
  ShieldAlert,
  Siren,
  Home,
} from "lucide-react";

const items = [
  { href: "/care", label: "Dashboard", icon: LayoutDashboard },
  { href: "/care/triage", label: "Triage", icon: Stethoscope },
  { href: "/care/vitals", label: "Vitals", icon: Activity },
  { href: "/care/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/care/mar", label: "MAR", icon: Pill },
  { href: "/care/observations", label: "Obs Schedule", icon: Clock },
  { href: "/care/handover", label: "Handover", icon: HandHelping },
  { href: "/care/patients", label: "Patients", icon: Users },
  { href: "/care/io", label: "I/O", icon: Droplets },
  { href: "/care/pain", label: "Pain", icon: Frown },
  { href: "/care/wound", label: "Wound", icon: Bandage },
  { href: "/care/fall-risk", label: "Fall Risk", icon: ShieldAlert },
  { href: "/care/emergency", label: "Emergency", icon: Siren },
  { href: "/care/home-care", label: "Home Care", icon: Home },
  { href: "/care/alerts", label: "Alerts", icon: AlertCircle },
  { href: "/care/notes", label: "Notes", icon: FileText },
];

export function CareSidebar() {
  const pathname = usePathname();
  const activeItem =
    [...items].sort((a, b) => b.href.length - a.href.length).find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) || null;

  return (
    <aside className="w-64 h-screen border-r bg-card flex flex-col">
      <div className="p-4 border-b bg-primary text-primary-foreground">
        <div className="text-lg font-bold">Tibbna Care</div>
        <div className="text-xs text-primary-foreground/80">Nursing & Emergency</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const active = item.href === activeItem?.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={cn("size-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        Shift: A | Nurse: A. Smith
      </div>
    </aside>
  );
}
