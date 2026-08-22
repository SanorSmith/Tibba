import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';


// GET - List promotions with filters
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = `
      SELECT 
        p.*,
        e.firstname || ' ' || e.lastname as employee_name,
        e.role as current_role,
        ab.firstname || ' ' || ab.lastname as approved_by_name
      FROM promotions p
      LEFT JOIN staff e ON p.employee_id = e.staffid
      LEFT JOIN staff ab ON p.approved_by = ab.staffid
      WHERE p.workspaceid = $1
    `;
    
    const params: any[] = [workspaceId];
    let paramCount = 2;

    if (employeeId) {
      query += ` AND p.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY p.promotion_date DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create promotion
export async function POST(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await request.json();
    
    const {
      employee_id,
      from_position,
      to_position,
      from_department,
      to_department,
      current_salary,
      new_salary,
      promotion_date,
      effective_date,
      reason,
      performance_review_id,
      status = 'PENDING'
    } = body;

    if (!employee_id || !from_position || !to_position || !promotion_date || !effective_date || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate salary increase
    const salaryIncrease = new_salary && current_salary ? new_salary - current_salary : 0;
    const salaryIncreasePercentage = current_salary ? (salaryIncrease / current_salary) * 100 : 0;

    const result = await pool.query(
      `INSERT INTO promotions (
        employee_id, from_position, to_position,
        from_department, to_department,
        current_salary, new_salary, salary_increase, salary_increase_percentage,
        promotion_date, effective_date, reason,
        performance_review_id, status, workspaceid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        employee_id, from_position, to_position,
        from_department, to_department,
        current_salary, new_salary, salaryIncrease, salaryIncreasePercentage,
        promotion_date, effective_date, reason,
        performance_review_id, status,
        workspaceId
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Promotion created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
