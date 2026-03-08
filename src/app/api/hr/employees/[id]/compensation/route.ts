import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/employees/[id]/compensation
 * Get employee compensation details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    const result = await pool.query(`
      SELECT 
        ec.employee_id,
        ec.basic_salary,
        ec.housing_allowance,
        ec.transport_allowance,
        ec.meal_allowance,
        ec.total_package,
        ec.currency,
        ec.effective_from,
        ec.effective_to,
        sg.grade_code as salary_grade,
        sg.grade_name
      FROM employee_compensation ec
      LEFT JOIN salary_grades sg ON ec.salary_grade_id = sg.id
      WHERE ec.employee_id = $1 
        AND ec.is_active = true
      ORDER BY ec.effective_from DESC
      LIMIT 1
    `, [employeeId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No compensation record found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error fetching employee compensation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
