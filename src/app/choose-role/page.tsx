'use client';

/**
 * Which role am I working as today?
 *
 * Sign-in used to go straight to whichever role opens the most of this app.
 * For someone holding one role that is exactly right and this page never
 * appears - it forwards on before rendering anything. For someone holding
 * several it was the only behaviour available, so an administrator who is
 * also an HR officer arrived as the administrator every time with nothing
 * to click.
 *
 * The platform asks the same question after you pick a facility. This is the
 * equivalent here, and it deliberately looks and behaves the same way.
 *
 * The difference worth knowing: choosing here narrows what you can open,
 * because the role in this app's session is what gates modules. Choosing HR
 * officer means seeing HR and not Finance. Switching back is one click in the
 * user menu.
 */
import { useEffect, useState } from 'react';
import { Loader2, UserCog } from 'lucide-react';

type Role = { role: string; label: string };

const ROLE_HINT: Record<string, string> = {
  administrator: 'Every module in this facility',
  accountant: 'Finance, invoices and payments',
  hr_officer: 'Staff, payroll, leave and recruitment',
  inventory_officer: 'Stock, suppliers and goods received',
  pharmacist: 'Dispensing and pharmacy stock',
  receptionist: 'Appointments, check-in and billing',
};

export default function ChooseRolePage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/switch-role')
      .then(async (r) => {
        // A 401 is not "no roles", it is "no session". Treating the two the
        // same is why a signed-out or expired session looked exactly like the
        // picker being broken: the page read an empty list and forwarded on
        // without a word.
        if (r.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        const all: Role[] = d?.roles ?? [];

        // Nothing to decide. Showing a page with one button would be a step
        // that exists only to be dismissed, so it forwards instead - to the
        // role's own home, never to `/`. The root is a static landing page
        // that no role's modules include, so sending anyone there means a
        // super admin sees a "Go to Login" screen and everyone else is bounced
        // to /unauthorized.
        if (all.length <= 1) {
          // Where they were heading before sign-in interrupted them, when the
          // callback judged it reachable for this role. Read from the address
          // rather than useSearchParams, which would need a Suspense boundary
          // for no benefit here.
          const requested = new URLSearchParams(window.location.search).get(
            'returnTo',
          );
          const safe =
            requested &&
            requested.startsWith('/') &&
            !requested.startsWith('//') &&
            requested !== '/' &&
            !requested.startsWith('/login');

          window.location.href = safe ? requested : d?.home ?? '/dashboard';
          return;
        }
        setRoles(all);
        setCurrent(d?.current ?? null);
      })
      .catch(() => {
        // Redirecting on a failure is guesswork: without the answer there is
        // no way to know which paths this role may open, and /dashboard would
        // bounce an HR officer straight to /unauthorized. Say so instead and
        // let them retry.
        setRoles([]);
        setError('Could not read your roles. Reload to try again.');
      });
  }, []);

  const choose = async (role: string) => {
    setBusy(role);
    setError(null);
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not switch to that role.');
        setBusy(null);
        return;
      }
      // A full navigation: the session cookie changed and every page has to be
      // rendered again against it.
      window.location.href = data.redirectTo ?? '/dashboard';
    } catch {
      setError('Could not switch to that role.');
      setBusy(null);
    }
  };

  if (!roles) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading&hellip;
      </div>
    );
  }

  // The load failed. Not a redirect: see the catch above.
  if (roles.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 p-6">
        <p className="text-sm text-red-600">{error}</p>
        <a href="/login" className="text-sm text-blue-600 hover:underline">
          Sign in again
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          How are you working today?
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          You hold {roles.length} roles here. Pick the one to open. You can
          switch at any time from the menu under your name.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {roles.map((r) => (
          <button
            key={r.role}
            type="button"
            disabled={!!busy}
            onClick={() => choose(r.role)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <UserCog className="h-4 w-4 text-gray-400" />
              <span>
                <span className="block font-medium text-gray-900">{r.label}</span>
                <span className="block text-sm text-gray-500">
                  {ROLE_HINT[r.role] ?? 'Open this role'}
                </span>
              </span>
            </span>
            {busy === r.role ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : current === r.role ? (
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500">
                current
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
