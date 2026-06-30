"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Shield, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeaderActions } from "@/components/sidebar/header-actions";
interface CareTopBarProps {
  user: {
    userid: string;
    name: string | null;
    email: string;
    image?: string | null;
    permissions?: unknown;
  };
}

export function CareTopBar({ user }: CareTopBarProps) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 shrink-0 flex items-center justify-between bg-[#618FF5] text-white px-4 gap-4">
      <Link href="/care" className="hover:opacity-80 transition-opacity">
        <h1 className="text-xl font-bold whitespace-nowrap">Tibbna-Care</h1>
      </Link>

      <div className="flex items-center gap-2 ml-auto">
        <HeaderActions />

        <button className="relative rounded-full p-2 hover:bg-white/20 transition-colors">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-white" />
        </button>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/20 transition-colors outline-none">
            <Avatar className="h-8 w-8 rounded-lg text-blue-900">
              {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
              <AvatarFallback className="rounded-lg text-xs font-semibold">
                {user.name?.charAt(0) ?? "N"}
              </AvatarFallback>
            </Avatar>
            <div className="grid text-left text-sm leading-tight hidden sm:grid">
              <span className="truncate font-medium text-white">{user.name}</span>
              <span className="truncate text-xs text-white/80">
                {now.toLocaleDateString()} • {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <ChevronsUpDown className="ml-1 size-4 text-white/80" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                <AvatarFallback className="rounded-lg">{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {(user.permissions as string[] | null)?.includes("admin") && (
              <DropdownMenuItem onClick={() => router.push("/d/admin")}>
                <Shield className="mr-2 size-4" />
                Admin Panel
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
            <LogOut className="mr-2 size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
