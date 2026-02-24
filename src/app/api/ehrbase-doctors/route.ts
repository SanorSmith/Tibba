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
    const workspaceid = searchParams.get('workspaceid') || 'fa9fb036-a7eb-49af-890c-54406dad139d';

    // Fetch all medical staff from the Neon database staff table
    // Include all staff and indicate which have corresponding users
    const doctors = await db`
      SELECT 
        s.staffid,
        CONCAT(s.firstname, ' ', COALESCE(s.middlename, ''), ' ', s.lastname) as name,
        s.email,
        s.unit,
        s.specialty,
        s.phone,
        s.role,
        u.userid as user_id,
        CASE WHEN u.userid IS NOT NULL THEN true ELSE false END as has_user_account
      FROM staff s
      LEFT JOIN users u ON s.email = u.email
      WHERE s.workspaceid = ${workspaceid}
      AND s.role IN ('doctor', 'nurse', 'lab_technician')
      ORDER BY 
        CASE 
          WHEN s.role = 'doctor' THEN 1
          WHEN s.role = 'nurse' THEN 2
          WHEN s.role = 'lab_technician' THEN 3
          ELSE 4
        END,
        s.firstname, s.lastname
    `;

    // Transform the data to match the expected format
    const transformedDoctors = doctors.map(doctor => ({
      userid: doctor.user_id || doctor.staffid, // Use user_id if available, otherwise staffid
      staffid: doctor.staffid, // Keep original staffid for reference
      name: doctor.name.replace(/\s+/g, ' ').trim(), // Clean up extra spaces
      email: doctor.email || '',
      unit: doctor.unit || 'General',
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      role: doctor.role,
      has_user_account: doctor.has_user_account, // Indicates if this staff can be assigned to appointments
    }));

    await db.end();

    return NextResponse.json({ 
      doctors: transformedDoctors,
      count: transformedDoctors.length,
      source: 'database'
    });
  } catch (error) {
    console.error('Error fetching doctors from database:', error);
    
    // Return fallback doctors list if database query fails
    const fallbackDoctors = [
      {
        userid: 'doctor-fallback-1',
        name: 'Dr. Ahmed Hassan',
        role: 'doctor',
        email: 'ahmed.hassan@tibbna.com',
        unit: 'Cardiology',
        specialty: 'Cardiologist',
      },
      {
        userid: 'doctor-fallback-2',
        name: 'Dr. Fatima Ali',
        role: 'doctor',
        email: 'fatima.ali@tibbna.com',
        unit: 'General Medicine',
        specialty: 'General Practitioner',
      },
      {
        userid: 'doctor-fallback-3',
        name: 'Dr. Mohammed Saleh',
        role: 'doctor',
        email: 'mohammed.saleh@tibbna.com',
        unit: 'Dermatology',
        specialty: 'Dermatologist',
      },
    ];

    return NextResponse.json({ 
      doctors: fallbackDoctors,
      count: fallbackDoctors.length,
      source: 'fallback',
      message: 'Using fallback doctors list. Database connection failed.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
