# Tests

## Running them

```bash
npm test              # unit + component tests, no infrastructure needed
npm run test:unit     # just the unit/component tests
npm run test:isolation # facility isolation + login auth (needs server + database)
```

`npm run test:isolation` signs in against a running dev server and reads the
real database. Start the server first (`npm run dev`), or point the tests
elsewhere with `TEST_BASE_URL`. These are excluded from `npm test` so a plain
run needs no infrastructure.

## What is covered

| Area | File | Notes |
|---|---|---|
| Password hashing/verification | `unit/password.test.ts` | Includes interop with the platform admin panel's format |
| Facility scoping helper | `unit/workspace.test.ts` | Asserts it fails closed on every malformed input |
| Facility badge | `unit/facility-badge.test.tsx` | Component test, jsdom |
| Facility isolation across the API | `integration/facility-isolation.test.ts` | 27 endpoints, two facilities |
| Login authentication | `integration/login-auth.test.ts` | Correct/wrong/missing password, account enumeration |

The isolation test asserts the property rather than row counts: it signs in as
two users in two facilities, calls the same endpoint as each, and requires that
no record returned to one appears in the other's response. That catches a
regression in any scoped route without needing to be updated when the data
changes.

It has been verified to actually fail: removing the facility filter from
`/api/specialties` turns it red, and restoring it turns it green again. A test
that cannot fail is not worth having.

## Known-failing tests (pre-existing)

These predate the current work. They were never running — `jest.config.js` had
a `testMatch` that matched two filenames which do not exist in the repo, so
`npm test` executed zero tests. Fixing the config revealed them.

| File | Failing | Why |
|---|---|---|
| `api/alerts.test.ts` | 6 | Imports `next-headers`, which is not a dependency, and tests `/api/hr/alerts`, which does not exist |
| `integration/leave-flow.test.ts` | 8 | `workflowService` reads Supabase; the mock in `jest.setup.js` returns `{ data: null }` for every query, so it throws "Leave request not found" |
| `integration/payroll-flow.test.ts` | 1 | "maximum overtime scenario" expects gross > 15000 and gets 14500 |

The payroll one is worth a look: it is either a missing component in
`PayrollCalculator` or an assertion that was never right. Deciding which needs
someone who knows the intended pay rules — changing the assertion to match the
current output would just be fabricating a pass.

They are left as they are rather than deleted or skipped, because that is a
call for whoever owns those features.
