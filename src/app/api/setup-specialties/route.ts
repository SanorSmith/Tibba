/**
 * Setup Specialties API - Create specialties table and sample data
 * GET /api/setup-specialties - Check table status
 * POST /api/setup-specialties - Create table and insert sample data
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Check if database URL is configured
const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// GET /api/setup-specialties - Check table status
export async function GET(request: NextRequest) {
  try {
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Checking specialties table status...');

    // Check if table exists
    const tableCheck = await pool!.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'specialties'
      ) as exists
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        message: 'Specialties table does not exist',
        table_exists: false,
        instructions: [
          '1. Send a POST request to this endpoint to create the table',
          '2. The table will be created with sample data',
          '3. After creation, you can use the specialties API'
        ]
      });
    }

    // Get table info
    const tableInfo = await pool!.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'specialties'
      ORDER BY ordinal_position
    `);

    // Get row count
    const countResult = await pool!.query('SELECT COUNT(*) as count FROM specialties');
    const rowCount = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      success: true,
      message: 'Specialties table exists',
      table_exists: true,
      row_count: rowCount,
      columns: tableInfo.rows,
      sample_data: rowCount > 0 ? {
        note: 'Table contains data'
      } : {
        note: 'Table is empty'
      }
    });

  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check specialties table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/setup-specialties - Create table and insert sample data
export async function POST(request: NextRequest) {
  try {
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Creating specialties table...');

    // Create specialties table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS specialties (
        specialtyid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        departmentid UUID REFERENCES departments(departmentid),
        code VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        createdat TIMESTAMP DEFAULT NOW(),
        updatedat TIMESTAMP DEFAULT NOW()
      );
    `;

    await pool!.query(createTableQuery);
    console.log('Specialties table created successfully');

    // Check if we need to insert sample data
    const countResult = await pool!.query('SELECT COUNT(*) as count FROM specialties');
    const existingCount = parseInt(countResult.rows[0].count);

    if (existingCount === 0) {
      console.log('Inserting sample specialties data...');

      // Get first department ID for foreign key
      const deptResult = await pool!.query('SELECT departmentid FROM departments LIMIT 1');
      const departmentId = deptResult.rows.length > 0 ? deptResult.rows[0].departmentid : null;

      const sampleSpecialties = [
        {
          name: 'Cardiology',
          description: 'Diagnosis and treatment of heart and cardiovascular conditions',
          code: 'CARD',
          department_id: departmentId
        },
        {
          name: 'Neurology',
          description: 'Diagnosis and treatment of nervous system disorders',
          code: 'NEUR',
          department_id: departmentId
        },
        {
          name: 'Pediatrics',
          description: 'Medical care for infants, children, and adolescents',
          code: 'PEDI',
          department_id: departmentId
        },
        {
          name: 'Emergency Medicine',
          description: 'Immediate medical care for acute illnesses and injuries',
          code: 'EMER',
          department_id: departmentId
        },
        {
          name: 'General Surgery',
          description: 'Surgical treatment of various medical conditions',
          code: 'GSUR',
          department_id: departmentId
        },
        {
          name: 'Internal Medicine',
          description: 'Diagnosis and treatment of adult diseases',
          code: 'IMED',
          department_id: departmentId
        },
        {
          name: 'Obstetrics & Gynecology',
          description: 'Women\'s health and reproductive medicine',
          code: 'OBGY',
          department_id: departmentId
        },
        {
          name: 'Orthopedics',
          description: 'Treatment of musculoskeletal system disorders',
          code: 'ORTH',
          department_id: departmentId
        },
        {
          name: 'Psychiatry',
          description: 'Diagnosis and treatment of mental health disorders',
          code: 'PSYC',
          department_id: departmentId
        },
        {
          name: 'Radiology',
          description: 'Medical imaging and diagnostic radiology services',
          code: 'RADI',
          department_id: departmentId
        }
      ];

      for (const specialty of sampleSpecialties) {
        await pool!.query(
          `INSERT INTO specialties (name, description, departmentid, code, is_active, createdat, updatedat)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            specialty.name,
            specialty.description,
            specialty.department_id,
            specialty.code,
            true
          ]
        );
      }

      console.log('Sample specialties data inserted successfully');
    } else {
      console.log('Specialties table already contains data, skipping sample data insertion');
    }

    // Verify the setup
    const finalCount = await pool!.query('SELECT COUNT(*) as count FROM specialties');
    const finalRowCount = parseInt(finalCount.rows[0].count);

    return NextResponse.json({
      success: true,
      message: 'Specialties table setup completed successfully',
      table_created: true,
      sample_data_inserted: existingCount === 0,
      total_specialties: finalRowCount,
      next_steps: [
        '1. Visit /departments/specialties to view specialties',
        '2. Use the specialties API for CRUD operations',
        '3. Add specialties to staff management forms'
      ]
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup specialties table',
        details: error instanceof Error ? error.message : 'Unknown error',
        instructions: [
          '1. Check database connection',
          '2. Verify departments table exists (required for foreign key)',
          '3. Check database permissions'
        ]
      },
      { status: 500 }
    );
  }
}
