import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.OPENEHR_DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// GET - Fetch staff from OpenEHR database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = `
      SELECT 
        staff_id,
        staff_name,
        staff_email,
        staff_phone,
        department_id,
        department_name,
        position,
        is_active
      FROM staff
      WHERE is_active = true
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (staff_name ILIKE $1 OR staff_id::text ILIKE $1 OR staff_email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY staff_name ASC LIMIT 20`;

    const staff = await sql.unsafe(query, params);

    return NextResponse.json(staff);
  } catch (error: any) {
    console.error('Error fetching staff from OpenEHR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff', details: error.message },
      { status: 500 }
    );
  }
}
