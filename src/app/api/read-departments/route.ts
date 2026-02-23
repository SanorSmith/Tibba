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
    console.log('Reading departments table from OpenEHR database...');
    
    // First, let's check what tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('Available tables:', tables.map(t => t.table_name));
    
    // Now try to read departments table
    let departments = [];
    try {
      departments = await sql`
        SELECT * FROM departments
        ORDER BY department_name ASC
      `;
      console.log('Departments found:', departments.length);
    } catch (deptError: any) {
      console.log('Error reading departments table:', deptError.message);
      
      // Try to see if there's a similar table
      const similarTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name ILIKE '%dept%' OR table_name ILIKE '%department%')
        ORDER BY table_name
      `;
      
      return NextResponse.json({
        message: 'Departments table not found',
        available_tables: tables.map(t => t.table_name),
        similar_tables: similarTables.map(t => t.table_name),
        error: deptError.message
      });
    }
    
    return NextResponse.json({
      message: 'Departments table read successfully',
      total_departments: departments.length,
      departments: departments,
      available_tables: tables.map(t => t.table_name)
    });

  } catch (error: any) {
    console.error('Database connection error:', error);
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
