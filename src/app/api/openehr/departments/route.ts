import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.OPENEHR_DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// GET - Fetch departments from OpenEHR database
export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT 
        department_id,
        department_name,
        department_name_ar,
        location,
        manager_name,
        is_active
      FROM departments
      WHERE is_active = true
      ORDER BY department_name ASC
    `;

    const departments = await sql.unsafe(query);

    return NextResponse.json(departments);
  } catch (error: any) {
    console.error('Error fetching departments from OpenEHR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments', details: error.message },
      { status: 500 }
    );
  }
}
