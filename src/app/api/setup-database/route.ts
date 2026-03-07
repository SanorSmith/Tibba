import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Setting up database tables...');

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

    // Create specialties table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialties (
        specialtyid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        departmentid UUID REFERENCES departments(departmentid),
        code VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create workspaces table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        workspaceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL DEFAULT 'Default Workspace',
        description TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create staff table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staffid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firstname VARCHAR(255) NOT NULL,
        middlename VARCHAR(255),
        lastname VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(100),
        unit VARCHAR(255),
        specialty VARCHAR(255),
        workspaceid UUID REFERENCES workspaces(workspaceid),
        createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Insert default workspace if it doesn't exist
    await pool.query(`
      INSERT INTO workspaces (workspaceid, name, description)
      VALUES (gen_random_uuid(), 'Default Workspace', 'Default workspace for staff')
      ON CONFLICT DO NOTHING
    `);

    // Insert sample departments if they don't exist
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

    // Insert sample specialties if they don't exist
    const sampleSpecialties = [
      { name: 'Interventional Cardiology', code: 'ICARD', department: 'Cardiology' },
      { name: 'General Cardiology', code: 'GCARD', department: 'Cardiology' },
      { name: 'Pediatric Cardiology', code: 'PCARD', department: 'Cardiology' },
      { name: 'Neurology', code: 'NEUR', department: 'Neurology' },
      { name: 'Pediatric Neurology', code: 'PNEUR', department: 'Neurology' },
      { name: 'General Pediatrics', code: 'GPED', department: 'Pediatrics' }
    ];

    for (const spec of sampleSpecialties) {
      await pool.query(`
        INSERT INTO specialties (name, code, departmentid, is_active)
        SELECT $1, $2, d.departmentid, true
        FROM departments d
        WHERE d.name = $3
        AND NOT EXISTS (
          SELECT 1 FROM specialties s 
          WHERE s.name = $1
        )
      `, [spec.name, spec.code, spec.department]);
    }

    console.log('Database setup completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database tables created and sample data inserted',
      tables: ['departments', 'specialties', 'workspaces', 'staff'],
      sampleData: {
        departments: sampleDepartments.length,
        specialties: sampleSpecialties.length
      }
    });

  } catch (error) {
    console.error('Database setup error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to setup database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
