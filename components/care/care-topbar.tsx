import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface CareTopBarProps {
  userName?: string | null;
}

export function CareTopBar({ userName }: CareTopBarProps) {
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "N";

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Badge variant="outline">Shift A</Badge>
        <span className="text-sm text-muted-foreground">Tibbna Care</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-accent">
          <Bell className="size-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm font-medium">{userName || "Nurse"}</span>
        </div>
      </div>
    </header>
  );
}
