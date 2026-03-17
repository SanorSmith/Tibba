import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the same database as patients API
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const staffId = params.id;

    console.log('Fetching staff member from database:', staffId);

    const query = `
      SELECT 
        staffid as id,
        firstname as "firstName",
        middlename as "middleName",
        lastname as "lastName",
        email,
        phone,
        role,
        unit,
        specialty,
        dateofbirth as "dateOfBirth",
        custom_staff_id as "customStaffId",
        createdat as "createdAt",
        updatedat as "updatedAt"
      FROM staff
      WHERE staffid = $1
    `;

    const result = await pool.query(query, [staffId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Staff member not found',
          details: `No staff member found with ID: ${staffId}`
        },
        { status: 404 }
      );
    }

    console.log('Staff member fetched successfully:', result.rows[0]);

    return NextResponse.json({
      success: true,
      staff: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching staff member:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff member',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
