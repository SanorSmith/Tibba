# Tables deliberately left readable across facilities

Every other table in `public` is under row-level security. These 23 are not,
and each is a decision rather than an oversight. Anything added to this list
needs a reason written next to it.

Run `node scripts/check-rls.mjs` to see the current state; a table that is open
and *not* listed here is a gap.

## Reference data, identical for every facility

Shared on purpose. A drug catalogue that differed per facility would be a bug,
and scoping these would mean 10 copies of the same 4,274 rows.

| Table | Rows | What it is |
| --- | --- | --- |
| `global_drugs` | 4,274 | The national drug catalogue |
| `openehr_medications` | 3,623 | openEHR medication concepts |
| `medications_catalog` | 30 | Medication reference list |
| `drug_interaction_groups` | 10 | Interaction group definitions |
| `drug_interactions` | 8 | Which groups conflict |
| `drug_group_mappings` | 32 | Drug-to-group membership |
| `chronic_disease_content` | 30 | Patient-education text |
| `currency_exchange_rates` | 6 | Rates, national |
| `social_security_rules` | 3 | Statutory contribution rates |
| `notification_templates` | 7 | Message templates |
| `insurance_companies_basic` | 3 | Insurer reference list |
| `workspace_roles` | 9 | The role catalogue itself |
| `daily_insights` | 147 | Cached health news |
| `news_cache` | 0 | Same, unused |

`insurance_companies` proper is already under RLS with reads shared — see
migration 0068. `insurance_companies_basic` is the smaller reference copy.

## Identity, which must be readable before a facility is known

The circular-dependency case from migration 0068, and the one that caused a
total login lockout when it was got wrong in the ERP.

| Table | Rows | Why it cannot be scoped |
| --- | --- | --- |
| `users` | 15 | A person exists before any facility is chosen. Which facilities they may enter is answered by `app_user_memberships`, a SECURITY DEFINER function, precisely so this table does not have to be. |
| `usersessions` | 1,111 | A session is looked up **by token, during authentication** — before a tenant exists. A tenant-scoped policy here would make every sign-in fail. |

`usersessions` is the weakest entry on this page: it holds session tokens, and
a restricted role can read all of them. Closing it means a SECURITY DEFINER
lookup that takes a token and returns one row, the same shape as
`app_user_role_in`. Worth doing; it is not a one-line change, and getting it
wrong locks everyone out.

## Empty, unreachable, or superseded

Nothing to leak today. Listed so they are not mistaken for protected.

| Table | Rows | Note |
| --- | --- | --- |
| `labs` | 2 | Superseded by `facility_labs` (migration 0076). No query reads it. |
| `labtests` | 3 | Hangs off `labs`; same. |
| `medication_inventory` | 0 | No facility column and no route writes it |
| `department_staffing_rules` | 0 | `organization_id` is not a workspace id — checked |
| `shift_rotations` | 0 | Same |
| `notification_preferences` | 0 | Same |
| `support_requests` | 1 | Public contact form; belongs to no facility |

`organization_id` appears on several of these and looks like a tenant key. It
is not: none of its values match a workspace id.

## What is protected

| | Tables |
| --- | --- |
| Own workspace column | 162 |
| Via a parent row (migration 0077) | 63 |
| Own column, backfilled from the patient (migration 0078) | 14 |
| **Open, by the decisions above** | **23** |

Isolation is only as good as the connection: all of this is bypassed while the
application connects as `neondb_owner`, which holds `BYPASSRLS`. See
`docs/tenant-isolation-cutover.md`.
