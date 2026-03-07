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

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const doctorId = searchParams.get('doctorid');

    if (!doctorId) {
      return NextResponse.json(
        { 
          error: 'Missing doctor ID',
          details: 'doctorid parameter is required'
        },
        { status: 400 }
      );
    }

    // For now, return empty booked slots since we don't have availability data
    // This can be extended later to include actual availability logic
    console.log('Fetching availability for doctor:', doctorId);

    // Query existing appointments for this doctor to get booked slots
    const query = `
      SELECT starttime, endtime
      FROM appointments
      WHERE doctorid = $1
      AND starttime >= NOW()
      AND status != 'cancelled'
      ORDER BY starttime
    `;

    const result = await pool.query(query, [doctorId]);

    // Transform booked slots into availability format
    const bookedSlots = result.rows.map(row => ({
      start: row.starttime,
      end: row.endtime
    }));

    return NextResponse.json({
      doctorId,
      bookedSlots,
      availableSlots: [], // Can be calculated based on working hours
      message: 'Doctor availability API - basic implementation'
    });

  } catch (error) {
    console.error('Doctor Availability API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch doctor availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
