import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');

    if (!startDate || !endDate) {
      await pool.end();
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
    `;

    const params: any[] = [startDate, endDate];

    if (departmentId) {
      query += ` AND s.unit = $3`;
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

    await pool.end();

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
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leave calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
