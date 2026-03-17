import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

// GET - List recognitions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = `
      SELECT 
        er.*,
        e.firstname || ' ' || e.lastname as employee_name,
        e.role as employee_role,
        rb.firstname || ' ' || rb.lastname as recognized_by_name,
        ab.firstname || ' ' || ab.lastname as approved_by_name
      FROM employee_recognitions er
      LEFT JOIN staff e ON er.employee_id = e.staffid
      LEFT JOIN staff rb ON er.recognized_by = rb.staffid
      LEFT JOIN staff ab ON er.approved_by = ab.staffid
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;

    if (employeeId) {
      query += ` AND er.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (status) {
      query += ` AND er.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (type) {
      query += ` AND er.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    query += ` ORDER BY er.recognition_date DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('Error fetching recognitions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create recognition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      employee_id,
      recognized_by,
      type,
      title,
      reason,
      monetary_reward = 0,
      status = 'PENDING',
      is_auto_suggested = false,
      suggestion_reason
    } = body;

    if (!employee_id || !type || !title || !reason) {
      return NextResponse.json(
        { success: false, error: 'employee_id, type, title, and reason are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO employee_recognitions (
        employee_id, recognized_by, type, title, reason,
        monetary_reward, status, is_auto_suggested, suggestion_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        employee_id, recognized_by, type, title, reason,
        monetary_reward, status, is_auto_suggested, suggestion_reason
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Recognition created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating recognition:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
