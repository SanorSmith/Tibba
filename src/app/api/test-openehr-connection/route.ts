import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.OPENEHR_DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function GET(request: NextRequest) {
  try {
    console.log('Testing OpenEHR Database Connection...');
    console.log('Database URL:', process.env.OPENEHR_DATABASE_URL ? 'Configured' : 'Not configured');

    // Test 1: Check if we can connect to the database
    const connectionTest = await sql`SELECT version()`;
    console.log('Database version:', connectionTest[0]);

    // Test 2: List all tables in the database
    const tables = await sql`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Tables found:', tables.length);

    // Test 3: Check if departments table exists and read data
    const departmentsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'departments'
      ) as exists
    `;
    
    let departmentsData: any[] = [];
    if (departmentsTable[0].exists) {
      departmentsData = await sql`
        SELECT 
          department_id,
          department_name,
          department_name_ar,
          location,
          manager_name,
          is_active
        FROM departments
        ORDER BY department_name ASC
        LIMIT 10
      `;
      console.log('Departments found:', departmentsData.length);
    }

    // Test 4: Check if staff table exists and read data
    const staffTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff'
      ) as exists
    `;
    
    let staffData: any[] = [];
    if (staffTable[0].exists) {
      staffData = await sql`
        SELECT 
          staff_id,
          staff_name,
          staff_email,
          department_id,
          department_name,
          position,
          is_active
        FROM staff
        WHERE is_active = true
        ORDER BY staff_name ASC
        LIMIT 10
      `;
      console.log('Staff found:', staffData.length);
    }

    // Test 5: Check if patients table exists (for reference)
    const patientsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patients'
      ) as exists
    `;

    const result = {
      connection: {
        status: 'Connected',
        database_version: connectionTest[0].version,
        url_configured: !!process.env.OPENEHR_DATABASE_URL
      },
      database_info: {
        total_tables: tables.length,
        table_names: tables.map(t => t.table_name)
      },
      departments: {
        table_exists: departmentsTable[0].exists,
        data: departmentsData,
        count: departmentsData.length
      },
      staff: {
        table_exists: staffTable[0].exists,
        data: staffData,
        count: staffData.length
      },
      patients: {
        table_exists: patientsTable[0].exists
      }
    };

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('OpenEHR Database Connection Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to OpenEHR database', 
        details: error.message,
        url_configured: !!process.env.OPENEHR_DATABASE_URL
      },
      { status: 500 }
    );
  }
}
