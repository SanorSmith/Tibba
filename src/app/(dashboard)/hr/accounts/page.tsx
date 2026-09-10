'use client';

/**
 * The sign-in accounts this facility created.
 *
 * Deliberately not "every account with a role here". That would include the
 * platform owner's people and staff from other facilities who also work in
 * this one, and none of those are this administrator's to change. The line is
 * `users.created_by_workspaceid` (migration 0090): a facility manages what it
 * made, and nothing else.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2, UserMinus, ExternalLink, X } from 'lucide-react';

type Account = {
  userid: string;
  name: string | null;
  email: string;
  isactive: boolean;
  created_via: string | null;
  /**
   * Every role held in this facility. A person can hold more than one since
   * migration 0093, and this screen used to show a single `role`, so someone
   * with five appeared five times over.
   */
  roles: string[];
  staffid: string | null;
  staff_name: string | null;
};

type Role = { name: string; label: string; opens_erp: boolean };

export default function FacilityAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff/accounts');
      if (res.status === 403) {
        setDenied(true);
        return;
      }
      const data = await res.json();
      setAccounts(data.accounts ?? []);
      setRoles(data.availableRoles ?? []);
    } catch {
      toast.error('Could not load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Adding, not replacing. Picking a role from the dropdown used to overwrite
  // whatever was there, which is how someone loses four roles by choosing a
  // fifth.
  const addRole = async (userid: string, role: string) => {
    if (!role) return;
    setBusy(userid);
    try {
      const res = await fetch('/api/staff/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add the role');
      toast.success(data.unchanged ? 'They already had that role' : 'Role added');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add the role');
    } finally {
      setBusy(null);
    }
  };

  const removeRole = async (a: Account, role: string) => {
    const who = a.name || a.email;
    if (a.roles.length === 1) {
      // Taking the only role is removing them from the facility, so it gets
      // the same warning as the Remove button rather than happening quietly
      // behind a small cross.
      const warning = `Take away ${role} from ${who}?

It is their only role here, so they lose access to this facility.`;
      if (!window.confirm(warning)) return;
    }

    setBusy(a.userid);
    try {
      const res = await fetch(
        '/api/staff/accounts?userid=' + encodeURIComponent(a.userid) +
        '&role=' + encodeURIComponent(role),
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not remove the role');
      toast.success(role + ' removed');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove the role');
    } finally {
      setBusy(null);
    }
  };

  const removeFromFacility = async (a: Account) => {
    const who = a.name || a.email;
    const warning =
      'Remove ' +
      who +
      ' from this facility?\n\nTheir account stays - they may work elsewhere on the platform - and their staff record keeps its history. They lose access here until an administrator gives them a role again.';
    if (!window.confirm(warning)) return;

    setBusy(a.userid);
    try {
      const res = await fetch(
        '/api/staff/accounts?userid=' + encodeURIComponent(a.userid),
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not remove them');
      toast.success(who + ' no longer has access to this facility');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove them');
    } finally {
      setBusy(null);
    }
  };

  if (denied) {
    return (
      <div className="p-6">
        <div className="max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Only an administrator or an HR officer of this facility can manage
          sign-in accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="w-6 h-6" />
          Sign-in accounts
        </h1>
        <p className="mt-1 text-sm text-gray-500 max-w-2xl">
          Accounts this facility created. People placed here by the platform
          owner, and staff from other facilities who also work here, are not
          listed &mdash; those belong to whoever created them. An HR officer
          sees and manages everyone except administrators.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading&hellip;
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600">
            This facility has not created any accounts yet.
          </p>
          <a
            href="/hr/employees/add"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Register a staff member and give them a login
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Staff record</th>
                <th className="px-4 py-3 font-medium">Roles here</th>
                <th className="px-4 py-3 font-medium text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((a) => (
                <tr key={a.userid} className={busy === a.userid ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.name || '—'}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {a.staff_name ? (
                      <span className="text-gray-700">{a.staff_name}</span>
                    ) : (
                      <span
                        className="text-xs text-amber-700"
                        title="This account has a role here but no employment record in this facility."
                      >
                        no staff record
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.roles.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.roles.map((role) => {
                          const known = roles.find((r) => r.name === role);
                          return (
                            <span
                              key={role}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-50 py-0.5 pl-2 pr-1 text-xs"
                              title={known?.opens_erp ? 'Opens the ERP' : undefined}
                            >
                              {known?.label ?? role}
                              {known?.opens_erp && (
                                <span className="text-[10px] text-gray-500">ERP</span>
                              )}
                              <button
                                type="button"
                                aria-label={'Remove ' + (known?.label ?? role)}
                                disabled={busy === a.userid}
                                onClick={() => removeRole(a, role)}
                                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-700 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">no role here</span>
                    )}

                    {/* Add, rather than replace. The value resets each time so
                        the control reads as an action, not a current state. */}
                    <select
                      className="mt-1.5 rounded-md border border-gray-300 px-2 py-1 text-xs"
                      value=""
                      disabled={busy === a.userid}
                      onChange={(e) => {
                        addRole(a.userid, e.target.value);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Add a role&hellip;</option>
                      {roles
                        .filter((r) => !a.roles.includes(r.name))
                        .map((r) => (
                          <option key={r.name} value={r.name}>
                            {r.label}
                            {r.opens_erp ? ' — opens the ERP' : ''}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy === a.userid}
                      onClick={() => removeFromFacility(a)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Remove from facility
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
