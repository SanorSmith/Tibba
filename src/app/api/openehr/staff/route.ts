/**
 * Staff, for the order screens that pick who a department order is for.
 *
 * Same failure as its departments neighbour. The query named `staff_id`,
 * `staff_name`, `staff_email`, `position` and `is_active` against a table
 * whose columns are `staffid`, `firstname`, `lastname`, `role` and `unit`, so
 * it threw on every request and the handler answered with a hardcoded list of
 * invented people. Anyone opening the internal orders screen was choosing from
 * staff who do not work at the hospital, in either copy of that screen.
 *
 * There was a POST as well, and it fabricated success the same way: the insert
 * failed, the error was swallowed, and a made-up staff record came back with
 * `success: true`. It is gone rather than repaired. Nothing called it, and a
 * second way to create staff would have bypassed everything the HR route does
 * - department resolution, compensation, the sign-in account link - while
 * being unable to satisfy the table's own NOT NULL columns anyway.
 *
 * `department_id` has no equivalent here. Since migration 004 a staff row
 * records its department as a name in `unit`, so the department filter matches
 * on that, and `department_id` comes back null rather than guessed at.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') ?? '').trim();
    // Sent as an id by the callers, but a staff row carries its department by
    // name. Matched against the name, so passing either still finds people.
    const department = (searchParams.get('department_id') ?? '').trim();

    return await withTenant(workspaceId, async () => {
      const params: unknown[] = [workspaceId];
      let where = 's.workspaceid = $1';

      if (search) {
        params.push(`%${search}%`);
        const p = `$${params.length}`;
        where +=
          ` AND (s.firstname ILIKE ${p} OR s.lastname ILIKE ${p}` +
          ` OR (s.firstname || ' ' || s.lastname) ILIKE ${p} OR s.email ILIKE ${p})`;
      }

      if (department) {
        params.push(department);
        where += ` AND s.unit = $${params.length}`;
      }

      const result = await pool.query(
        `SELECT s.staffid                                            AS id,
                trim(s.firstname || ' ' || coalesce(s.middlename || ' ', '') || s.lastname)
                                                                     AS name,
                s.email,
                s.phone,
                NULL::text                                           AS department_id,
                s.unit                                               AS department_name,
                s.role                                               AS position,
                s.specialty,
                s.custom_staff_id                                    AS staff_number,
                true                                                 AS active,
                s.createdat                                          AS created_at,
                s.updatedat                                          AS updated_at
           FROM staff s
          WHERE ${where}
          ORDER BY s.firstname, s.lastname
          LIMIT 200`,
        params,
      );

      return NextResponse.json(result.rows);
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      {
        error: 'Could not load staff',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
