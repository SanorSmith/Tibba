import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== MINIMAL DEPARTMENTS ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    console.log('Creating departments table...');

    // Simple table creation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Table created, inserting data...');

    // Insert sample data
    await pool.query(`
      INSERT INTO departments (name, description) 
      VALUES ('Cardiology', 'Heart care')
      ON CONFLICT DO NOTHING
    `);

    await pool.query(`
      INSERT INTO departments (name, description) 
      VALUES ('Neurology', 'Brain care')
      ON CONFLICT DO NOTHING
    `);

    // Test query
    const result = await pool.query('SELECT * FROM departments');
    console.log('Departments:', result.rows.length);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Departments table created',
      count: result.rows.length,
      departments: result.rows
    });

  } catch (error) {
    console.error('MINIMAL DEPARTMENTS ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create departments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
