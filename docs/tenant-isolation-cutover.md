# Turning tenant isolation on

Everything described here is built, applied to the production database, and
verified. What remains is one environment variable per app — and an ordering
constraint that cannot be skipped.

## Why this is not already done

Both apps connect as `neondb_owner`, which holds `BYPASSRLS`. Every policy on
all 164 tables is ignored, which is exactly what made it safe to build and
test the whole layer against production without affecting anything running.

Isolation begins when the connection string moves to `app_user`.

## The ordering constraint

**The currently deployed code does not call `withTenant`.** If the connection
string moves to `app_user` before the new code is deployed, every query runs
with no `app.workspace_id` set, every policy matches nothing, and both
applications return empty results across the board. Not a degradation — a
total outage, with no error to explain it.

So:

1. Merge and deploy both branches first.
2. Confirm the deployed apps work normally, still on `neondb_owner`.
3. Only then change the connection string.

This is also why the `NOT NULL` constraints on the four stock tables are
still relaxed (migration 0066). Restore them after step 2, not before —
they were relaxed precisely because a live deployment was writing rows the
new constraint would reject.

## Before you flip

- [ ] `SESSION_SECRET` set in the ERP's Vercel environment (32+ characters).
      Sign-in fails closed without it, deliberately. Everyone is logged out
      once when this ships, because unsigned cookies stop verifying.
- [ ] Both branches deployed and working.
- [ ] `NOT NULL` restored on the stock tables.

## The flip

Change `DATABASE_URL` to the `app_user` connection string in both apps'
environments, then redeploy. Keep the `neondb_owner` string somewhere you can
reach quickly.

## Rolling back

Put `DATABASE_URL` back to `neondb_owner` and redeploy. Nothing about the
schema changes when you flip, so the rollback is complete and immediate. No
data is written differently under one role than the other.

## What was verified, and how

Run against production as `app_user`, exercising the application's own data
access code rather than hand-written SQL:

| Check | Result |
| --- | --- |
| Membership check for a real member | `true` |
| Same check for a non-member | `false` |
| Facilities listed for a user | 1 — the one they belong to |
| Invoices inside their tenant | 1 |
| Invoices with no tenant set | 0 |
| Patients readable without a tenant | 169 — shared by design |
| Tables with RLS on but no policy | 0 |
| Tables app_user cannot read or write | 0 |
| Tables with a tenant column but RLS off | 0 |

The platform also boots and serves under `app_user` with no permission
errors in its log.

## The three questions RLS cannot answer for itself

Each is a `SECURITY DEFINER` function, and each exists because the answer is
needed *before* a tenant exists:

- `app_user_role_in(userid, workspaceid)` — may this caller enter this
  facility? Reading `workspaceusers` directly would be circular, and under
  `app_user` returned nothing, so every guard answered 403 and the whole
  application locked itself out.
- `app_user_memberships(userid)` — which facilities may they choose from?
  Same circularity, one level up; 124 files depend on it.
- `app_owner_workspace(kind, id)` — which facility owns this record? For
  routes reached with only a receipt, shift, return, sample, worklist,
  storage or order id.

Each returns the minimum: a role, a list of memberships, or one workspace id.

## What is shared on purpose

Migration 0068 opens `SELECT` on `patients`, `workspaces` and
`insurance_companies` while keeping writes tenant-scoped. That is the rule
this system is built to: any facility may read a patient's general
information, no facility may read another's orders, results, bills or stock.
