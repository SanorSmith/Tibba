import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== CHECK TABLES ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    // Check if departments table exists
    const tableCheck = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('departments', 'specialties')
      ORDER BY table_name, ordinal_position
    `);

    console.log('Tables info:', tableCheck.rows);

    // Try to drop and recreate departments table
    if (tableCheck.rows.some(row => row.table_name === 'departments')) {
      console.log('Dropping existing departments table...');
      await pool.query('DROP TABLE IF EXISTS departments CASCADE');
    }

    // Create new departments table
    console.log('Creating new departments table...');
    await pool.query(`
      CREATE TABLE departments (
        departmentid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Insert sample data
    const departments = [
      { name: 'Cardiology', description: 'Heart and vascular care' },
      { name: 'Neurology', description: 'Brain and nervous system care' },
      { name: 'Pediatrics', description: 'Children medical care' },
      { name: 'Emergency', description: 'Emergency medical services' },
      { name: 'Surgery', description: 'Surgical operations' },
      { name: 'Radiology', description: 'Medical imaging services' }
    ];

    for (const dept of departments) {
      await pool.query(`
        INSERT INTO departments (name, description)
        VALUES ($1, $2)
      `, [dept.name, dept.description]);
    }

    // Test the table
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    console.log('Created departments:', result.rows.length);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Departments table recreated',
      originalTables: tableCheck.rows,
      departments: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('CHECK TABLES ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check/recreate tables',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}
