import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the non-medical database (Neon DB)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection for non-medical patient data
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// Generate patient number function
function generatePatientNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `P-${year}-${random}`;
}

// Phone number normalization function
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('00964')) {
    // 00964 770 3171017 -> 9647703171017
    return digits.substring(2); // Remove 00
  } else if (digits.startsWith('964')) {
    // 9647703171017 -> 9647703171017 (already normalized)
    return digits;
  } else if (digits.startsWith('07')) {
    // 07703171017 -> 9647703171017
    return '964' + digits.substring(1);
  } else if (digits.startsWith('7') && digits.length === 10) {
    // 7703171017 -> 9647703171017
    return '964' + digits;
  }
  
  // Return as-is if no pattern matches
  return digits;
}

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search') || '';
    const governorate = searchParams.get('governorate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log('Fetching patients from non-medical database...');
    console.log('Search term:', searchTerm);
    console.log('Governorate filter:', governorate);
    console.log('Page:', page, 'Limit:', limit);

    // Build the base query with age calculation
    let query = `
      SELECT 
        p.patientid as id,
        p.ehrid as patient_number,
        p.firstname as first_name_ar,
        p.firstname as first_name_en,
        p.middlename as middle_name,
        p.lastname as last_name_ar,
        p.lastname as last_name_en,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname as full_name_ar,
        p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname as full_name_en,
        p.dateofbirth::date as date_of_birth,
        EXTRACT(YEAR FROM AGE(p.dateofbirth::date)) as age,
        p.gender,
        p.bloodgroup as blood_group,
        p.nationalid as national_id,
        p.phone,
        p.phone as mobile,
        p.email,
        p.address,
        NULL as governorate,
        NULL as district,
        NULL as neighborhood,
        NULL as emergency_contact_name_ar,
        NULL as emergency_contact_phone,
        NULL as emergency_contact_relationship_ar,
        p.medicalhistory as medical_history,
        0 as total_balance,
        true as is_active,
        p.createdat as created_at,
        p.updatedat as updated_at,
        NULL as insurance_state,
        NULL as insurance_number,
        NULL as insurance_company,
        NULL as next_appointment
      FROM patients p
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add search filters
    if (searchTerm) {
      // Normalize the search term for phone number matching
      const normalizedSearch = normalizePhoneNumber(searchTerm);
      
      // Check if search term looks like a phone number (mostly digits)
      const isPhoneSearch = /^\+?[0-9\s\-\(\)]+$/.test(searchTerm.replace(/\s/g, ''));
      
      if (isPhoneSearch) {
        // Phone number search - use phone matching logic
        query += ` AND (
          p.phone ILIKE $${paramIndex} OR 
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 1} OR
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 2} OR
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 3} OR
          REGEXP_REPLACE(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${paramIndex + 4}
        )`;
        
        params.push(
          `%${searchTerm}%`,           // Original search term
          `%${normalizedSearch}%`,     // Normalized format (9647703171017)
          `%+${normalizedSearch}%`,    // With + prefix (+9647703171017)
          `%00${normalizedSearch}%`,  // With 00 prefix (009647703171017)
          `%0${normalizedSearch.substring(3)}%` // Local format (07703171017)
        );
        paramIndex += 5;
      } else {
        // Name search - prioritize full name matches, then individual parts
        const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (searchWords.length === 1) {
          // Single word search - match first name, last name, or full name
          query += ` AND (
            p.firstname ILIKE $${paramIndex} OR 
            p.lastname ILIKE $${paramIndex} OR 
            p.middlename ILIKE $${paramIndex} OR
            (p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname) ILIKE $${paramIndex} OR
            p.ehrid ILIKE $${paramIndex} OR 
            p.nationalid ILIKE $${paramIndex} OR 
            p.email ILIKE $${paramIndex}
          )`;
          params.push(`%${searchTerm}%`);
          paramIndex += 1;
        } else {
          // Multiple words search - prioritize exact sequence matches
          query += ` AND (
            (p.firstname || ' ' || COALESCE(p.middlename || ' ', '') || p.lastname) ILIKE $${paramIndex} OR
            (p.firstname || ' ' || p.lastname) ILIKE $${paramIndex} OR
            (p.lastname || ' ' || p.firstname) ILIKE $${paramIndex} OR
            (p.firstname ILIKE $${paramIndex + 1} AND p.lastname ILIKE $${paramIndex + 2}) OR
            (p.firstname ILIKE $${paramIndex + 2} AND p.lastname ILIKE $${paramIndex + 1}) OR
            p.ehrid ILIKE $${paramIndex} OR 
            p.nationalid ILIKE $${paramIndex} OR 
            p.email ILIKE $${paramIndex}
          )`;
          
          params.push(
            `%${searchTerm}%`,                    // Full sequence search
            `%${searchWords[0]}%`,                // First word
            `%${searchWords[searchWords.length - 1]}%`  // Last word
          );
          paramIndex += 3;
        }
      }
    }

    if (governorate) {
      // Since governorate doesn't exist in the actual table, we'll skip this filter
      // but keep the parameter for compatibility
      console.log('Governorate filter not supported - column does not exist in table');
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('Executing query:', query);
    console.log('Parameters:', params);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM patients
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    if (searchTerm) {
      // Normalize the search term for phone number matching
      const normalizedSearch = normalizePhoneNumber(searchTerm);
      
      // Check if search term looks like a phone number (mostly digits)
      const isPhoneSearch = /^\+?[0-9\s\-\(\)]+$/.test(searchTerm.replace(/\s/g, ''));
      
      if (isPhoneSearch) {
        // Phone number search - use phone matching logic
        countQuery += ` AND (
          phone ILIKE $${countParamIndex} OR 
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 1} OR
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 2} OR
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 3} OR
          REGEXP_REPLACE(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '^00964', '964') ILIKE $${countParamIndex + 4}
        )`;
        
        countParams.push(
          `%${searchTerm}%`,           // Original search term
          `%${normalizedSearch}%`,     // Normalized format (9647703171017)
          `%+${normalizedSearch}%`,    // With + prefix (+9647703171017)
          `%00${normalizedSearch}%`,  // With 00 prefix (009647703171017)
          `%0${normalizedSearch.substring(3)}%` // Local format (07703171017)
        );
        countParamIndex += 5;
      } else {
        // Name search - prioritize full name matches, then individual parts
        const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (searchWords.length === 1) {
          // Single word search - match first name, last name, or full name
          countQuery += ` AND (
            firstname ILIKE $${countParamIndex} OR 
            lastname ILIKE $${countParamIndex} OR 
            middlename ILIKE $${countParamIndex} OR
            (firstname || ' ' || COALESCE(middlename || ' ', '') || lastname) ILIKE $${countParamIndex} OR
            ehrid ILIKE $${countParamIndex} OR 
            nationalid ILIKE $${countParamIndex} OR 
            email ILIKE $${countParamIndex}
          )`;
          countParams.push(`%${searchTerm}%`);
          countParamIndex += 1;
        } else {
          // Multiple words search - prioritize exact sequence matches
          countQuery += ` AND (
            (firstname || ' ' || COALESCE(middlename || ' ', '') || lastname) ILIKE $${countParamIndex} OR
            (firstname || ' ' || lastname) ILIKE $${countParamIndex} OR
            (lastname || ' ' || firstname) ILIKE $${countParamIndex} OR
            (firstname ILIKE $${countParamIndex + 1} AND lastname ILIKE $${countParamIndex + 2}) OR
            (firstname ILIKE $${countParamIndex + 2} AND lastname ILIKE $${countParamIndex + 1}) OR
            ehrid ILIKE $${countParamIndex} OR 
            nationalid ILIKE $${countParamIndex} OR 
            email ILIKE $${countParamIndex}
          )`;
          
          countParams.push(
            `%${searchTerm}%`,                    // Full sequence search
            `%${searchWords[0]}%`,                // First word
            `%${searchWords[searchWords.length - 1]}%`  // Last word
          );
          countParamIndex += 3;
        }
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalPatients = parseInt(countResult.rows[0].total);

    console.log(`Found ${result.rows.length} patients out of ${totalPatients} total`);

    // Transform the data to match the expected format
    const patients = result.rows.map(row => ({
      id: row.id,
      patientNumber: row.patient_number,
      firstNameAr: row.first_name_ar,
      firstNameEn: row.first_name_en,
      middleName: row.middle_name,
      lastNameAr: row.last_name_ar,
      lastNameEn: row.last_name_en,
      fullNameAr: row.full_name_ar,
      fullNameEn: row.full_name_en,
      dateOfBirth: row.date_of_birth,
      age: parseInt(row.age) || 0,
      gender: row.gender,
      bloodGroup: row.blood_group,
      nationalId: row.national_id,
      phone: row.phone,
      mobile: row.mobile,
      email: row.email,
      address: row.address,
      governorate: row.governorate,
      district: row.district,
      neighborhood: row.neighborhood,
      emergencyContactNameAr: row.emergency_contact_name_ar,
      emergencyContactPhone: row.emergency_contact_phone,
      emergencyContactRelationshipAr: row.emergency_contact_relationship_ar,
      medicalHistory: row.medical_history,
      totalBalance: parseFloat(row.total_balance) || 0,
      isActive: row.is_active,
      insuranceState: row.insurance_state,
      insuranceNumber: row.insurance_number,
      insuranceCompany: row.insurance_company,
      nextAppointment: row.next_appointment,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total: totalPatients,
        totalPages: Math.ceil(totalPatients / limit),
        hasNext: page * limit < totalPatients,
        hasPrev: page > 1
      },
      metadata: {
        database: 'Neon Non-Medical DB',
        connection: 'DATABASE_URL',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch patients',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          database: 'Neon Non-Medical DB',
          connection: 'DATABASE_URL'
        }
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
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Creating new patient:', body);

    // Generate patient number if not provided
    const patientNumber = body.patientNumber || generatePatientNumber();

    // Build the insert query
    const query = `
      INSERT INTO patients (
        id,
        patient_number,
        first_name_ar,
        first_name_en,
        middle_name,
        last_name_ar,
        last_name_en,
        full_name_ar,
        full_name_en,
        date_of_birth,
        gender,
        blood_group,
        national_id,
        phone,
        mobile,
        email,
        governorate,
        district,
        neighborhood,
        emergency_contact_name_ar,
        emergency_contact_phone,
        emergency_contact_relationship_ar,
        medical_history,
        total_balance,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        $22,
        $23,
        $24,
        NOW(),
        NOW()
      ) RETURNING *
    `;

    const params = [
      patientNumber,
      body.firstNameAr,
      body.firstNameEn || null,
      body.middleName || null,
      body.lastNameAr,
      body.lastNameEn || null,
      body.fullNameAr || `${body.firstNameAr} ${body.middleName || ''} ${body.lastNameAr}`.trim(),
      body.fullNameEn || `${body.firstNameEn || ''} ${body.middleName || ''} ${body.lastNameEn || ''}`.trim(),
      body.dateOfBirth,
      body.gender,
      body.bloodGroup || null,
      body.nationalId || null,
      body.phone,
      body.mobile || null,
      body.email || null,
      body.governorate || null,
      body.district || null,
      body.neighborhood || null,
      body.emergencyContactNameAr || null,
      body.emergencyContactPhone || null,
      body.emergencyContactRelationshipAr || null,
      body.medicalHistory || null,
      body.totalBalance || 0,
      body.isActive !== undefined ? body.isActive : true
    ];

    console.log('Executing insert query:', query);
    console.log('Parameters:', params);

    const result = await pool.query(query, params);
    const newPatient = result.rows[0];

    console.log('Patient created successfully:', newPatient);

    // Transform the response data
    const responsePatient = {
      id: newPatient.id,
      patientNumber: newPatient.patient_number,
      firstNameAr: newPatient.first_name_ar,
      firstNameEn: newPatient.first_name_en,
      middleName: newPatient.middle_name,
      lastNameAr: newPatient.last_name_ar,
      lastNameEn: newPatient.last_name_en,
      fullNameAr: newPatient.full_name_ar,
      fullNameEn: newPatient.full_name_en,
      dateOfBirth: newPatient.date_of_birth,
      gender: newPatient.gender,
      bloodGroup: newPatient.blood_group,
      nationalId: newPatient.national_id,
      phone: newPatient.phone,
      mobile: newPatient.mobile,
      email: newPatient.email,
      governorate: newPatient.governorate,
      district: newPatient.district,
      neighborhood: newPatient.neighborhood,
      emergencyContactNameAr: newPatient.emergency_contact_name_ar,
      emergencyContactPhone: newPatient.emergency_contact_phone,
      emergencyContactRelationshipAr: newPatient.emergency_contact_relationship_ar,
      medicalHistory: newPatient.medical_history,
      totalBalance: parseFloat(newPatient.total_balance) || 0,
      isActive: newPatient.is_active,
      createdAt: newPatient.created_at,
      updatedAt: newPatient.updated_at
    };

    return NextResponse.json({
      success: true,
      data: responsePatient,
      message: 'Patient created successfully',
      metadata: {
        database: 'Neon Non-Medical DB',
        connection: 'DATABASE_URL',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create patient',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          database: 'Neon Non-Medical DB',
          connection: 'DATABASE_URL'
        }
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
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required for update' },
        { status: 400 }
      );
    }

    console.log('Updating patient:', id, updateData);

    // Build the update query dynamically
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    // Map the fields to database columns
    const fieldMapping: Record<string, string> = {
      firstNameAr: 'first_name_ar',
      firstNameEn: 'first_name_en',
      middleName: 'middle_name',
      lastNameAr: 'last_name_ar',
      lastNameEn: 'last_name_en',
      fullNameAr: 'full_name_ar',
      fullNameEn: 'full_name_en',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      bloodGroup: 'blood_group',
      nationalId: 'national_id',
      phone: 'phone',
      mobile: 'mobile',
      email: 'email',
      governorate: 'governorate',
      district: 'district',
      neighborhood: 'neighborhood',
      emergencyContactNameAr: 'emergency_contact_name_ar',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelationshipAr: 'emergency_contact_relationship_ar',
      medicalHistory: 'medical_history',
      totalBalance: 'total_balance',
      isActive: 'is_active'
    };

    for (const [field, value] of Object.entries(updateData)) {
      if (fieldMapping[field]) {
        updateFields.push(`${fieldMapping[field]} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add the WHERE condition parameter
    params.push(id);

    const query = `
      UPDATE patients 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('Executing update query:', query);
    console.log('Parameters:', params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const updatedPatient = result.rows[0];

    // Transform the response data
    const responsePatient = {
      id: updatedPatient.id,
      patientNumber: updatedPatient.patient_number,
      firstNameAr: updatedPatient.first_name_ar,
      firstNameEn: updatedPatient.first_name_en,
      middleName: updatedPatient.middle_name,
      lastNameAr: updatedPatient.last_name_ar,
      lastNameEn: updatedPatient.last_name_en,
      fullNameAr: updatedPatient.full_name_ar,
      fullNameEn: updatedPatient.full_name_en,
      dateOfBirth: updatedPatient.date_of_birth,
      gender: updatedPatient.gender,
      bloodGroup: updatedPatient.blood_group,
      nationalId: updatedPatient.national_id,
      phone: updatedPatient.phone,
      mobile: updatedPatient.mobile,
      email: updatedPatient.email,
      governorate: updatedPatient.governorate,
      district: updatedPatient.district,
      neighborhood: updatedPatient.neighborhood,
      emergencyContactNameAr: updatedPatient.emergency_contact_name_ar,
      emergencyContactPhone: updatedPatient.emergency_contact_phone,
      emergencyContactRelationshipAr: updatedPatient.emergency_contact_relationship_ar,
      medicalHistory: updatedPatient.medical_history,
      totalBalance: parseFloat(updatedPatient.total_balance) || 0,
      isActive: updatedPatient.is_active,
      createdAt: updatedPatient.created_at,
      updatedAt: updatedPatient.updated_at
    };

    return NextResponse.json({
      success: true,
      data: responsePatient,
      message: 'Patient updated successfully',
      metadata: {
        database: 'Neon Non-Medical DB',
        connection: 'DATABASE_URL',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update patient',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          database: 'Neon Non-Medical DB',
          connection: 'DATABASE_URL'
        }
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
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required for deletion' },
        { status: 400 }
      );
    }

    console.log('Deleting patient:', id);

    const query = 'DELETE FROM patients WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('Patient deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
      metadata: {
        database: 'Neon Non-Medical DB',
        connection: 'DATABASE_URL',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete patient',
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          database: 'Neon Non-Medical DB',
          connection: 'DATABASE_URL'
        }
      },
      { status: 500 }
    );
  }
}
