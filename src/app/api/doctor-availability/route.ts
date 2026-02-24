import { NextRequest, NextResponse } from 'next/server';

async function getDbConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }
  const postgres = (await import('postgres')).default;
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return sql;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const doctorid = searchParams.get('doctorid');
    const workspaceid = searchParams.get('workspaceid') || 'fa9fb036-a7eb-49af-890c-54406dad139d';

    if (!doctorid) {
      return NextResponse.json(
        { error: 'doctorid is required' },
        { status: 400 }
      );
    }

    // Fetch all appointments for the specified doctor
    const appointments = await db`
      SELECT 
        appointmentid,
        starttime,
        endtime,
        status,
        appointmentname,
        appointmenttype,
        location,
        unit
      FROM appointments
      WHERE doctorid = ${doctorid}
      AND workspaceid = ${workspaceid}
      AND status NOT IN ('cancelled', 'completed')
      AND starttime >= NOW() - INTERVAL '7 days'
      AND starttime <= NOW() + INTERVAL '30 days'
      ORDER BY starttime ASC
    `;

    // Transform appointments into booked slots format
    const bookedSlots = appointments.map(apt => ({
      appointmentId: apt.appointmentid,
      startTime: apt.starttime,
      endTime: apt.endtime,
      status: apt.status,
      date: new Date(apt.starttime).toISOString().split('T')[0], // YYYY-MM-DD
      timeSlot: {
        start: new Date(apt.starttime),
        end: new Date(apt.endtime)
      }
    }));

    await db.end();

    return NextResponse.json({ 
      bookedSlots,
      count: bookedSlots.length,
      doctorid,
      workspaceid
    });

  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctor availability', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
