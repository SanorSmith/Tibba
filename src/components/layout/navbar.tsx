'use client';

import { useState } from 'react';
import { Search, Settings, HelpCircle, Bell, Menu, X } from 'lucide-react';
import { UserMenu } from './user-menu';

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <nav
      className="flex items-center justify-between text-white sticky top-0 z-50 lg:static"
      style={{
        width: '100%',
        height: '56px',
        padding: '0 12px',
        backgroundColor: 'rgb(97, 143, 245)',
      }}
    >
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-2 lg:gap-6">
        <button
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded transition-colors"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-base lg:text-lg font-bold tracking-tight cursor-pointer whitespace-nowrap">
          <span className="hidden sm:inline">Tibbna EHR</span>
          <span className="sm:hidden">Tibbna</span>
        </h1>

        {/* Desktop search */}
        <div className="hidden lg:block relative">
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

      {/* Right controls */}
      <div className="flex items-center" style={{ gap: '2px' }}>
        {/* Mobile search toggle */}
        <button
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded transition-colors"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
        >
          {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
        </button>

        {/* Desktop-only controls */}
        <button className="hidden lg:flex p-2 hover:bg-white/10 rounded transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="hidden lg:flex p-2 hover:bg-white/10 rounded transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Bell - always visible */}
        <button className="p-2 hover:bg-white/10 rounded transition-colors relative">
          <Bell size={18} className="lg:w-5 lg:h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <UserMenu />
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 p-3 z-50" style={{ backgroundColor: 'rgb(97, 143, 245)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              className="w-full h-10 pl-10 pr-4 rounded-lg text-black placeholder-gray-400 focus:outline-none"
              style={{ fontSize: '16px', backgroundColor: '#ffffff' }}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
