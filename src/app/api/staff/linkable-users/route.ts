/**
 * The login accounts this facility can attach to an employment record.
 *
 * A staff row and a user account are two halves of one person, and until
 * migration 004 nothing joined them: the ERP knew "Dr Ahmed Al-Rashid, Doctor"
 * and the platform knew a user with an email, and neither could name the
 * other. An appointment booked against the staff half therefore pointed at an
 * id no dashboard could resolve.
 *
 * Only members of this facility are offered. That is the whole point - linking
 * an employment record here to a login belonging to another hospital would
 * hand that hospital's user a way in, so the list is scoped, the write is
 * checked again in the route, and the database refuses it a third time with a
 * trigger. Isolation that depends on the dropdown being short is not
 * isolation.
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
    if (!pool) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    return await withTenant(workspaceId, async () => {
      const result = await pool!.query(
        `SELECT u.userid,
                u.name,
                u.email,
                -- Roles aggregated, not one row each. Since migration 0093 a
                -- person can hold several here, and joining the membership
                -- table plainly listed the same account once per role.
                string_agg(DISTINCT wu.role, ', ' ORDER BY wu.role)
                                                          AS "platformRole",
                s.staffid                                 AS "linkedStaffId",
                trim(coalesce(s.firstname, '') || ' ' ||
                     coalesce(s.lastname, ''))            AS "linkedStaffName"
           FROM workspaceusers wu
           JOIN users u ON u.userid = wu.userid
           LEFT JOIN staff s
                  ON s.userid = u.userid AND s.workspaceid = wu.workspaceid
          WHERE wu.workspaceid = $1
          GROUP BY u.userid, u.name, u.email, s.staffid, s.firstname, s.lastname
          ORDER BY u.name NULLS LAST, u.email`,
        [workspaceId]
      );

      return NextResponse.json({
        success: true,
        users: result.rows,
        count: result.rows.length,
      });
    });
  } catch (error) {
    console.error('Error listing linkable user accounts:', error);
    return NextResponse.json(
      {
        error: 'Failed to list user accounts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
