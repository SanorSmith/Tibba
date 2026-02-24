import { NextRequest, NextResponse } from 'next/server';

async function getDbConnection() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
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
    const query = searchParams.get('q');

    // If no query provided, return all patients (for initial load)
    if (!query || query.trim() === '') {
      const allPatients = await db`
        SELECT 
          patientid,
          firstname,
          middlename,
          lastname,
          nationalid,
          phone,
          email,
          dateofbirth,
          address
        FROM patients
        ORDER BY 
          firstname ASC,
          lastname ASC
        LIMIT 50
      `;

      const transformedPatients = allPatients.map(patient => ({
        patientid: patient.patientid,
        firstname: patient.firstname,
        middlename: patient.middlename,
        lastname: patient.lastname,
        nationalid: patient.nationalid,
        phone: patient.phone,
        email: patient.email,
        dateofbirth: patient.dateofbirth,
        address: patient.address,
      }));

      return NextResponse.json({ patients: transformedPatients });
    }

    // Search patients in the Neon database using the patients table
    const patients = await db`
      SELECT 
        patientid,
        firstname,
        middlename,
        lastname,
        nationalid,
        phone,
        email,
        dateofbirth,
        address
      FROM patients
      WHERE 
        LOWER(firstname) LIKE LOWER(${'%' + query + '%'})
        OR LOWER(lastname) LIKE LOWER(${'%' + query + '%'})
        OR LOWER(nationalid) LIKE LOWER(${'%' + query + '%'})
        OR LOWER(phone) LIKE LOWER(${'%' + query + '%'})
      ORDER BY 
        firstname ASC,
        lastname ASC
      LIMIT 20
    `;

    // Transform the data to match the expected format
    const transformedPatients = patients.map(patient => ({
      patientid: patient.patientid,
      firstname: patient.firstname,
      middlename: patient.middlename,
      lastname: patient.lastname,
      nationalid: patient.nationalid,
      phone: patient.phone,
      email: patient.email,
      dateofbirth: patient.dateofbirth,
      address: patient.address,
    }));

    return NextResponse.json({ patients: transformedPatients });
  } catch (error) {
    console.error('Error searching patients:', error);
    return NextResponse.json(
      { error: 'Failed to search patients', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
