import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {

  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }


  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    let query = `
      SELECT 
        lr.id,
        lr.request_number,
        lr.employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.unit as department,
        s.role,
        lt.name as leave_type,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.status
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN staff s ON lr.employee_id = s.staffid
      WHERE lr.status = 'APPROVED'
        AND lr.start_date <= $2
        AND lr.end_date >= $1
        AND lr.workspaceid = $3
    `;

    const params: any[] = [startDate, endDate, workspaceId];

    if (departmentId) {
      query += ` AND s.unit = $4`;
      params.push(departmentId);
    }

    query += ` ORDER BY lr.start_date ASC`;

    const result = await pool.query(query, params);

    // Get holidays in the same period
    const holidays = await pool.query(`
      SELECT * FROM holidays 
      WHERE date >= $1 AND date <= $2 AND is_active = true
      ORDER BY date ASC
    `, [startDate, endDate]);


    return NextResponse.json({
      success: true,
      data: {
        leaves: result.rows,
        holidays: holidays.rows
      },
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching leave calendar:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leave calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
  });
}
