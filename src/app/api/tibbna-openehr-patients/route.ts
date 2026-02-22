// FILE: src/app/api/tibbna-openehr-patients/route.ts
// FIXED: Proper postgres client syntax with error handling

import { NextRequest, NextResponse } from 'next/server';

// Import the raw postgres connection
const openehrDatabaseUrl = process.env.OPENEHR_DATABASE_URL;

// Dynamic import of postgres
let postgres: any;
let sql: any;

async function getDbConnection() {
  if (!postgres) {
    postgres = (await import('postgres')).default;
    sql = postgres(openehrDatabaseUrl!, { 
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  return sql;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 OpenEHR DB URL check:', openehrDatabaseUrl ? 'SET' : 'NOT SET');
    
    if (!openehrDatabaseUrl) {
      console.error('❌ OPENEHR_DATABASE_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'OpenEHR database not configured',
          hint: 'Please set OPENEHR_DATABASE_URL environment variable in Vercel',
          envCheck: {
            OPENEHR_DATABASE_URL: 'NOT SET'
          }
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const id = searchParams.get('id');

    console.log('🔗 Attempting to connect to OpenEHR database...');
    const db = await getDbConnection();
    console.log('✅ Database connection established');

    // If specific patient ID requested
    if (id) {
      console.log(`🔍 Fetching patient by ID: ${id}`);
      const result = await db`
        SELECT * FROM patients 
        WHERE patientid = ${id}
      `;
      
      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }
      
      console.log(`✅ Found patient: ${id}`);
      return NextResponse.json(result[0]);
    }

    // Search patients
    let query;
    if (search && search.trim()) {
      console.log(`🔍 Searching patients with term: "${search}"`);
      query = db`
        SELECT * FROM patients 
        WHERE 
          firstname ILIKE ${'%' + search + '%'} OR 
          lastname ILIKE ${'%' + search + '%'} OR
          phone ILIKE ${'%' + search + '%'} OR
          email ILIKE ${'%' + search + '%'}
        ORDER BY firstname, lastname
        LIMIT ${limit}
      `;
    } else {
      console.log(`📋 Fetching all patients (limit: ${limit})`);
      query = db`
        SELECT * FROM patients 
        ORDER BY firstname, lastname
        LIMIT ${limit}
      `;
    }

    const patients = await query;
    console.log(`✅ Fetched ${patients.length} patients from Tibbna OpenEHR DB`);
    
    return NextResponse.json(patients);

  } catch (error: any) {
    console.error('❌ GET patients error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch patients from Tibbna OpenEHR DB',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!openehrDatabaseUrl) {
      return NextResponse.json(
        { error: 'Teammate database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('📝 Creating patient - Received data:', JSON.stringify(body, null, 2));

    const db = await getDbConnection();

    // Generate UUID for new patient
    const patientId = crypto.randomUUID();

    // First, get a valid workspaceid from existing patients
    const existingPatients = await db`SELECT workspaceid FROM patients LIMIT 1`;
    const defaultWorkspaceId = existingPatients[0]?.workspaceid || crypto.randomUUID();

    // Prepare patient data with defaults
    const patientData = {
      patientid: patientId,
      firstname: body.first_name_ar || body.first_name_en || body.first_name || body.firstname || '',
      lastname: body.last_name_ar || body.last_name_en || body.last_name || body.lastname || '',
      dateofbirth: body.date_of_birth || body.dateofbirth || null,
      gender: body.gender?.toLowerCase() || 'other',
      phone: body.phone || null,
      email: body.email || null,
      address: body.governorate || body.address || null,
      nationalid: body.national_id || body.nationalid || null,
      medicalhistory: body.medical_history || body.medicalhistory || null,
      workspaceid: body.workspace_id || body.workspaceid || defaultWorkspaceId,
      ehrid: body.ehr_id || body.ehrid || null,
    };

    console.log('📝 Mapped patient data to save:', JSON.stringify(patientData, null, 2));

    // Insert patient
    const result = await db`
      INSERT INTO patients (
        patientid, firstname, lastname, dateofbirth, gender,
        phone, email, address, nationalid, medicalhistory,
        workspaceid, ehrid
      ) VALUES (
        ${patientData.patientid},
        ${patientData.firstname},
        ${patientData.lastname},
        ${patientData.dateofbirth},
        ${patientData.gender},
        ${patientData.phone},
        ${patientData.email},
        ${patientData.address},
        ${patientData.nationalid},
        ${patientData.medicalhistory},
        ${patientData.workspaceid},
        ${patientData.ehrid}
      )
      RETURNING *
    `;

    console.log('✅ Patient created in Tibbna OpenEHR DB:', result[0].patientid);
    return NextResponse.json(result[0], { status: 201 });

  } catch (error: any) {
    console.error('❌ POST patient error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create patient in Tibbna OpenEHR DB',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!openehrDatabaseUrl) {
      return NextResponse.json(
        { error: 'Teammate database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const patientId = body.patient_id || body.patientid;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    console.log('📝 Updating patient in Tibbna OpenEHR DB:', patientId);

    const db = await getDbConnection();

    // Build update data
    const updateData: any = {};
    if (body.first_name_ar || body.first_name_en || body.first_name || body.firstname) {
      updateData.firstname = body.first_name_ar || body.first_name_en || body.first_name || body.firstname;
    }
    if (body.last_name_ar || body.last_name_en || body.last_name || body.lastname) {
      updateData.lastname = body.last_name_ar || body.last_name_en || body.last_name || body.lastname;
    }
    if (body.date_of_birth || body.dateofbirth) updateData.dateofbirth = body.date_of_birth || body.dateofbirth;
    if (body.gender) updateData.gender = body.gender.toLowerCase();
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.governorate !== undefined || body.address !== undefined) updateData.address = body.governorate || body.address;
    if (body.national_id || body.nationalid) updateData.nationalid = body.national_id || body.nationalid;
    if (body.medical_history || body.medicalhistory) updateData.medicalhistory = body.medical_history || body.medicalhistory;

    // Update patient
    const result = await db`
      UPDATE patients 
      SET ${db(updateData)}
      WHERE patientid = ${patientId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('✅ Patient updated in Tibbna OpenEHR DB:', patientId);
    return NextResponse.json(result[0]);

  } catch (error: any) {
    console.error('❌ PUT patient error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update patient in Tibbna OpenEHR DB',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!openehrDatabaseUrl) {
      return NextResponse.json(
        { error: 'Teammate database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting patient from Tibbna OpenEHR DB:', patientId);

    const db = await getDbConnection();

    // Delete patient
    const result = await db`
      DELETE FROM patients 
      WHERE patientid = ${patientId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('✅ Patient deleted from Tibbna OpenEHR DB:', patientId);
    return NextResponse.json({ 
      success: true, 
      message: 'Patient deleted from Tibbna OpenEHR DB',
      data: result[0]
    });

  } catch (error: any) {
    console.error('❌ DELETE patient error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete patient from Tibbna OpenEHR DB',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
