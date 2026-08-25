import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(request: NextRequest) {
  // Schema/seed utility. These endpoints create tables, seed rows and — in
  // the appointments cases — drop foreign-key constraints on tables shared by
  // every facility, so the blast radius is the whole platform rather than one
  // hospital. A workspace filter is not the right control here; requiring a
  // session is the minimum. These should probably be deleted outright, but
  // that is a call for the repo owner, not something to do silently.
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {

  try {
    console.log('=== MINIMAL DEPARTMENTS ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    

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
  });
}
