import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/hr/compensation
 * Get employee compensation details including payment frequency
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        id,
        employee_id,
        basic_salary,
        housing_allowance,
        transport_allowance,
        meal_allowance,
        payment_frequency,
        currency,
        salary_grade_id,
        effective_from,
        effective_to,
        is_active
      FROM employee_compensation
      WHERE employee_id = $1 AND is_active = true
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [employee_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No compensation record found'
      });
    }

    const compensation = result.rows[0];
    const total_package = 
      (parseFloat(compensation.basic_salary) || 0) +
      (parseFloat(compensation.housing_allowance) || 0) +
      (parseFloat(compensation.transport_allowance) || 0) +
      (parseFloat(compensation.meal_allowance) || 0);

    return NextResponse.json({
      success: true,
      data: {
        ...compensation,
        total_package
      }
    });

  } catch (error: any) {
    console.error('Error fetching compensation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/compensation
 * Create or update employee compensation with payment frequency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      employee_id,
      basic_salary,
      housing_allowance = 0,
      transport_allowance = 0,
      meal_allowance = 0,
      payment_frequency = 'MONTHLY',
      currency = 'IQD',
      salary_grade_id,
      effective_from
    } = body;

    if (!employee_id || !basic_salary) {
      return NextResponse.json(
        { success: false, error: 'employee_id and basic_salary are required' },
        { status: 400 }
      );
    }

    // Validate payment frequency
    const validFrequencies = ['WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'];
    if (!validFrequencies.includes(payment_frequency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment frequency' },
        { status: 400 }
      );
    }

    // Deactivate previous compensation records
    await pool.query(
      `UPDATE employee_compensation 
       SET is_active = false, effective_to = CURRENT_DATE 
       WHERE employee_id = $1 AND is_active = true`,
      [employee_id]
    );

    // Insert new compensation record
    const insertQuery = `
      INSERT INTO employee_compensation (
        employee_id,
        basic_salary,
        housing_allowance,
        transport_allowance,
        meal_allowance,
        payment_frequency,
        currency,
        salary_grade_id,
        effective_from,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      employee_id,
      basic_salary,
      housing_allowance,
      transport_allowance,
      meal_allowance,
      payment_frequency,
      currency,
      salary_grade_id,
      effective_from || new Date().toISOString().split('T')[0]
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Compensation saved successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error saving compensation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/compensation
 * Update existing compensation record
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      id,
      employee_id,
      basic_salary,
      housing_allowance,
      transport_allowance,
      meal_allowance,
      payment_frequency
    } = body;

    if (!id && !employee_id) {
      return NextResponse.json(
        { success: false, error: 'id or employee_id is required' },
        { status: 400 }
      );
    }

    // Validate payment frequency if provided
    if (payment_frequency) {
      const validFrequencies = ['WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'];
      if (!validFrequencies.includes(payment_frequency)) {
        return NextResponse.json(
          { success: false, error: 'Invalid payment frequency' },
          { status: 400 }
        );
      }
    }

    const total_package = 
      (parseFloat(basic_salary) || 0) +
      (parseFloat(housing_allowance) || 0) +
      (parseFloat(transport_allowance) || 0) +
      (parseFloat(meal_allowance) || 0);

    const updateQuery = `
      UPDATE employee_compensation 
      SET 
        basic_salary = COALESCE($1, basic_salary),
        housing_allowance = COALESCE($2, housing_allowance),
        transport_allowance = COALESCE($3, transport_allowance),
        meal_allowance = COALESCE($4, meal_allowance),
        payment_frequency = COALESCE($5, payment_frequency),
        total_package = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${id ? 'id = $7' : 'employee_id = $7 AND is_active = true'}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      basic_salary,
      housing_allowance,
      transport_allowance,
      meal_allowance,
      payment_frequency,
      total_package,
      id || employee_id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Compensation record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Compensation updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating compensation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
