'use client';

import { useState } from 'react';
import { Search, Settings, HelpCircle, Menu, X, ChevronsUpDown } from 'lucide-react';
import { UserMenu } from './user-menu';

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center bg-[#618FF5] justify-between gap-4 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      {/* Left: hamburger + logo + search */}
      <div className="flex items-center flex-1 min-w-0">
        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded transition-colors mr-2"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <h1 className="text-xl text-white font-bold whitespace-nowrap mr-8">Tibbna-EHR</h1>

        {/* Search bar */}
        <div className="flex-1 max-w-xl ml-16">
          <div className="relative w-full max-w-md">
            <div className="relative">
              <Search className="absolute text-white left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patients by name or ID..."
                className="file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-9 pr-3 h-9 text-white text-sm placeholder:text-white/80 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-[1px] focus:ring-orange-400 focus:border-orange-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: controls + user menu */}
      <div className="flex items-center gap-2">
        {/* Settings button */}
        <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-accent/50 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-white hover:bg-white/20 hover:text-blue-900">
          <Settings className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Settings</span>
        </button>

        {/* Help button */}
        <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-accent/50 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-white hover:bg-white/20 hover:text-blue-900">
          <HelpCircle className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Help</span>
        </button>

        {/* User menu dropdown */}
        <UserMenu />
      </div>
    </header>
  );
}
