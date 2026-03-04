import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the same OpenEHR database as staff
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

    console.log('🔍 Fetching patients from OpenEHR database...');

    // Query the staff table for patient data
    const result = await pool.query(`
      SELECT 
        staffid as patientid,
        firstname,
        middlename,
        lastname,
        email,
        phone,
        role,
        unit as department,
        specialty,
        dateofbirth,
        custom_staff_id as patient_number,
        createdat,
        updatedat
      FROM staff
      ORDER BY createdat DESC
    `);

    console.log(`✅ Found ${result.rows.length} patients in OpenEHR database`);

    // Transform the data to match the expected patient structure
    const patients = result.rows.map(row => ({
      patientid: row.patientid,
      patient_number: row.patient_number || `P-${row.patientid.slice(-8)}`,
      firstname: row.firstname,
      middlename: row.middlename,
      lastname: row.lastname,
      email: row.email,
      phone: row.phone,
      role: row.role,
      department: row.department,
      specialty: row.specialty,
      dateofbirth: row.dateofbirth,
      gender: 'MALE', // Default gender since column doesn't exist
      custom_staff_id: row.patient_number,
      createdat: row.createdat,
      updatedat: row.updatedat,
      // Additional fields for patient context
      source: 'OpenEHR Database',
      is_active: true,
      total_balance: 0
    }));

    return NextResponse.json(patients);

  } catch (error) {
    console.error('❌ Error fetching patients from OpenEHR database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch patients from OpenEHR database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      firstname,
      middlename,
      lastname,
      email,
      phone,
      role,
      unit,
      specialty,
      dateofbirth
    } = body;

    // Generate UUID for the new patient
    const patientId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    // Generate patient number
    const patientNumber = `P-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

    // Get default workspace ID
    const workspaceResult = await pool.query('SELECT workspaceid FROM workspaces LIMIT 1');
    const workspaceId = workspaceResult.rows[0]?.workspaceid || 'default-workspace';

    // Insert new patient into staff table (used as patient registry)
    const result = await pool.query(`
      INSERT INTO staff (
        staffid,
        workspaceid,
        firstname,
        middlename,
        lastname,
        role,
        unit,
        specialty,
        phone,
        email,
        dateofbirth,
        custom_staff_id,
        createdat,
        updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING *
    `, [
      patientId,
      workspaceId,
      firstname,
      middlename || null,
      lastname,
      role || 'PATIENT',
      unit || 'GENERAL',
      specialty || null,
      phone,
      email,
      dateofbirth,
      patientNumber
    ]);

    console.log('✅ New patient created:', patientId);

    return NextResponse.json({
      success: true,
      message: 'Patient created successfully',
      data: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create patient',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updateKeys = Object.keys(updateFields);
    const updateValues = Object.values(updateFields);
    
    if (updateKeys.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const setClause = updateKeys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    const result = await pool.query(`
      UPDATE staff 
      SET ${setClause}, updatedat = NOW()
      WHERE staffid = $1
      RETURNING *
    `, [id, ...updateValues]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('✅ Patient updated:', id);

    return NextResponse.json({
      success: true,
      message: 'Patient updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update patient',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      DELETE FROM staff 
      WHERE staffid = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('✅ Patient deleted:', id);

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error deleting patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete patient',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
