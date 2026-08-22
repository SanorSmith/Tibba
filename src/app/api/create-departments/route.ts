import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export async function GET(request: NextRequest) {
  // Schema/seed utility. These endpoints create tables, seed rows and — in
  // the appointments cases — drop foreign-key constraints on tables shared by
  // every facility, so the blast radius is the whole platform rather than one
  // hospital. A workspace filter is not the right control here; requiring a
  // session is the minimum. These should probably be deleted outright, but
  // that is a call for the repo owner, not something to do silently.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    console.log('=== CREATE DEPARTMENTS TABLE ===');
    
    const { Pool } = await import('pg');
    
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
    }


    console.log('Creating departments table...');

    // Create departments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        departmentid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('Table created, inserting sample data...');

    // Insert sample departments
    const sampleDepartments = [
      { name: 'Cardiology', description: 'Heart and vascular care' },
      { name: 'Neurology', description: 'Brain and nervous system care' },
      { name: 'Pediatrics', description: 'Children medical care' },
      { name: 'Emergency', description: 'Emergency medical services' },
      { name: 'Surgery', description: 'Surgical operations' },
      { name: 'Radiology', description: 'Medical imaging services' }
    ];

    for (const dept of sampleDepartments) {
      await pool.query(`
        INSERT INTO departments (name, description)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [dept.name, dept.description]);
    }

    console.log('Sample data inserted');

    // Test the table
    const result = await pool.query('SELECT COUNT(*) as count FROM departments');
    console.log('Departments count:', result.rows[0].count);


    return NextResponse.json({
      success: true,
      message: 'Departments table created and populated',
      count: result.rows[0].count,
      departments: sampleDepartments.length
    });

  } catch (error) {
    console.error('CREATE DEPARTMENTS ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create departments table',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}
