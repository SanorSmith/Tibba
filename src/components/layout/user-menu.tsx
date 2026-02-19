'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ');
}

export function UserMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <a
        href="/login"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
      >
        <User className="w-4 h-4" />
        Sign In
      </a>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-md transition-colors focus:outline-none">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-white text-blue-600 font-bold text-sm">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden lg:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-white">{user.name}</span>
          <span className="text-[11px] text-white/70">{formatRole(user.role)}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-white/80" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{formatRole(user.role)}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
