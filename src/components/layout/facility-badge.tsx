'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

/**
 * Shows which facility the current session is scoped to.
 *
 * Every query in the app is filtered by the session's workspace, so the same
 * screen shows completely different data depending on which facility you
 * signed in to. Without this the interface gives no clue which one that is —
 * a real hazard when someone has access to more than one hospital.
 */
export function FacilityBadge() {
  const [facility, setFacility] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setFacility(d?.user?.workspaceName ?? null);
      })
      .catch(() => {
        if (!cancelled) setFacility(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render nothing rather than a placeholder: a box reading "Unknown facility"
  // is worse than no box, because it looks like a real facility name.
  if (!facility) return null;

  // Some workspace names carry trailing whitespace in the database.
  const name = facility.trim();

  return (
    <span
      className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white whitespace-nowrap"
      title={`You are signed in to ${name}. Data shown is limited to this facility.`}
      data-testid="facility-badge"
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">Current facility: </span>
      <span className="max-w-[12rem] truncate">{name}</span>
    </span>
  );
}
