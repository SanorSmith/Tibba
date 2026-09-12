/**
 * Departments, for the screens that book internal orders against them.
 *
 * Every query here named columns this schema does not have -
 * `department_id`, `department_name`, `department_code`, `is_active` - against
 * a table whose columns are `departmentid`, `name` and `description`. So the
 * SELECT threw on every request and the handler answered with a hardcoded list
 * of five invented departments instead. Emergency Medicine, Cardiology and the
 * rest were never in the database; they were in this file.
 *
 * There was a POST too, and it was worse. It failed the same way, caught the
 * error, and returned `success: true` with a department object it had just
 * made up: nothing stored, success reported. It is gone rather than repaired,
 * because nothing called it and departments are created from the HR screens.
 *
 * The GET now uses the real columns and invents nothing. A database error is
 * returned as an error, because a screen showing five departments that do not
 * exist is worse than a screen showing a failure.
 *
 * Three fields the callers read have nowhere to live in this table:
 * `name_ar`, `code` and `manager`. They come back null rather than blank, so
 * the difference between "not recorded" and "recorded as empty" survives on
 * screen.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

/**
 * The shape both order screens read. `description` carries the location,
 * matching what /api/hospital/departments already does with the same column.
 */
const SELECT_DEPARTMENTS = `
  SELECT d.departmentid          AS id,
         d.name                  AS name,
         NULL::text              AS name_ar,
         NULL::text              AS code,
         d.description           AS location,
         NULL::text              AS manager,
         true                    AS active,
         d.phone,
         d.email,
         d.createdat             AS created_at,
         d.updatedat             AS updated_at
    FROM departments d
   WHERE d.workspaceid = $1
   ORDER BY d.name
`;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security scopes
    // the query in the database as well as in its WHERE clause.
    return await withTenant(workspaceId, async () => {
      const result = await pool.query(SELECT_DEPARTMENTS, [workspaceId]);
      return NextResponse.json(result.rows);
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      {
        error: 'Could not load departments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
