'use client';

import { Search, Settings, HelpCircle, Bell } from 'lucide-react';
import { UserMenu } from './user-menu';

export function Navbar() {
  return (
    <nav
      className="flex items-center justify-between text-white"
      style={{
        height: '64px',
        padding: '0 16px',
        backgroundColor: 'rgb(97, 143, 245)',
      }}
    >
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold tracking-tight cursor-pointer">Tibbna EHR</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="text"
            placeholder="Search..."
            style={{
              width: '198px',
              height: '36px',
              padding: '4px 12px 4px 36px',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
            }}
            className="placeholder-white/60 focus:outline-none focus:bg-white/25"
          />
        </div>
      </div>

      <div className="flex items-center" style={{ gap: '4px' }}>
        <button className="p-2 hover:bg-white/10 rounded transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-white/10 rounded transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-white/10 rounded transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <UserMenu />
      </div>
    </nav>
  );
}
