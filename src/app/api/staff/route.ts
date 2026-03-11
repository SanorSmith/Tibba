import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Generate UUID function (for workspace IDs)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate custom staff ID
// Format: [Dept1][Spec3][YY][DD][SEQ3]
// Example: CCAR26151001
// C = Cardiology (1st char)
// CAR = Cardiology specialty (3 chars)
// 26 = Year 2026 (last 2 digits)
// 15 = Day of birth (DD)
// 001 = Sequence number (3 digits)
function generateStaffId(
  department: string,
  specialty: string,
  dateOfBirth: string
): string {
  try {
    // Extract components
    const deptChar = department ? department.charAt(0).toUpperCase() : 'G';
    const specChars = specialty 
      ? specialty.substring(0, 3).toUpperCase().replace(/\s/g, '') 
      : 'GEN';
    
    // Parse date of birth
    const dob = new Date(dateOfBirth);
    const year = dob.getFullYear().toString().slice(-2); // Last 2 digits
    const day = dob.getDate().toString().padStart(2, '0'); // Day with leading zero
    
    // Get next sequence number for this department/specialty combination
    const prefix = `${deptChar}${specChars}${year}${day}`;
    
    // For now, just use sequence 1 (we can implement proper sequencing later)
    const sequenceNumber = 1;
    const seqStr = sequenceNumber.toString().padStart(3, '0');
    
    // Construct final staff ID
    const staffId = `${prefix}${seqStr}`;
    
    return staffId;
  } catch (error) {
    console.error('Error generating staff ID:', error);
    // Fallback to UUID if generation fails
    return generateUUID();
  }
}

// Use the same database as patients API
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

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
    const searchTerm = searchParams.get('q') || '';
    const specialty = searchParams.get('occupation');
    const department = searchParams.get('department');

    console.log('Fetching staff from database...');
    console.log('Search term:', searchTerm);
    console.log('Specialty filter:', specialty);
    console.log('Department filter:', department);

    let query = `
      SELECT 
        staffid as id,
        firstname as "firstName",
        middlename as "middleName",
        lastname as "lastName",
        email,
        phone,
        role,
        unit,
        specialty,
        dateofbirth as "dateOfBirth",
        custom_staff_id as "customStaffId",
        createdat as "createdAt",
        updatedat as "updatedAt"
      FROM staff
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (searchTerm) {
      query += ` AND (
        firstname ILIKE $${paramIndex} OR 
        lastname ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR 
        role ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (specialty) {
      query += ` AND specialty ILIKE $${paramIndex}`;
      params.push(`%${specialty}%`);
      paramIndex++;
    }

    if (department) {
      query += ` AND unit ILIKE $${paramIndex}`;
      params.push(`%${department}%`);
      paramIndex++;
    }

    query += ` ORDER BY lastname, firstname`;

    const result = await pool.query(query, params);

    console.log('Staff query executed successfully');
    console.log('Found', result.rows.length, 'staff members');

    return NextResponse.json({
      success: true,
      staff: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching staff:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff',
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
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    console.log('Creating new staff member:', body);

    // Extract form data
    const {
      firstName,
      middleName,
      lastName,
      role,
      unit,
      specialty,
      phone,
      email,
      dateOfBirth,
      gender,
      maritalStatus,
      nationality,
      nationalId,
      address,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      // Employment Details
      jobTitle,
      departmentId,
      employeeCategory,
      employmentType,
      dateOfHire,
      gradeId,
      basicSalary,
      shiftId,
      bankName,
      bankAccountNumber,
      // Employee Profile
      cvSummary,
      education,
      workHistory,
      certifications,
      languages,
      skills,
      // Settlement Rules
      pensionEligible,
      pensionScheme,
      pensionStartDate,
      pensionContributionRate,
      employerPensionRate,
      socialSecurityNumber,
      socialSecurityRate,
      taxIdNumber,
      taxExemptionAmount,
      settlementEligible,
      settlementCalculationMethod,
      noticePeriodDays,
      gratuityEligible,
      workspaceId
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !unit || !specialty || !dateOfBirth || !gender) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['firstName', 'lastName', 'email', 'phone', 'unit', 'specialty', 'dateOfBirth', 'gender']
        },
        { status: 400 }
      );
    }

    // Generate staff IDs
    const staffId = generateUUID(); // Primary key (UUID)
    const customStaffId = generateStaffId(unit, specialty, dateOfBirth); // Custom format
    console.log('✅ Generated UUID:', staffId);
    console.log('✅ Generated Custom ID:', customStaffId);
    
    // Get an existing workspace ID or use provided one
    let defaultWorkspaceId = workspaceId;
    
    if (!defaultWorkspaceId) {
      // Try to get an existing workspace from the database
      try {
        const existingWorkspace = await pool.query(`
          SELECT workspaceid FROM workspaces LIMIT 1
        `);
        
        if (existingWorkspace.rows.length > 0) {
          defaultWorkspaceId = existingWorkspace.rows[0].workspaceid;
        } else {
          // If no workspace exists, create a default one
          const newWorkspaceId = generateUUID();
          await pool.query(`
            INSERT INTO workspaces (workspaceid, name) VALUES ($1, 'Default Workspace')
          `, [newWorkspaceId]);
          defaultWorkspaceId = newWorkspaceId;
        }
      } catch (error) {
        // If workspaces table doesn't exist or other error, generate a UUID
        console.log('Workspaces table not accessible, using generated UUID');
        defaultWorkspaceId = generateUUID();
      }
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert new staff member (personal info only)
      const newStaff = await client.query(`
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
          custom_staff_id,
          gender,
          marital_status,
          nationality,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          dateofbirth,
          createdat,
          updatedat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
        )
        RETURNING *
      `, [
        staffId,
        defaultWorkspaceId,
        firstName,
        middleName || null,
        lastName,
        role || 'Staff',
        unit || 'General',
        specialty || null,
        phone,
        email,
        customStaffId,
        gender,
        maritalStatus || null,
        nationality || 'Iraqi',
        address || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
        emergencyContactRelationship || null,
        dateOfBirth
      ]);
      
      // Insert employment details if any provided
      if (jobTitle || departmentId || employeeCategory || employmentType || dateOfHire || gradeId || basicSalary || shiftId) {
        await client.query(`
          INSERT INTO employment_details (
            staff_id,
            job_title,
            department_id,
            employee_category,
            employment_type,
            date_of_hire,
            grade_id,
            basic_salary,
            shift_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
        `, [
          staffId,
          jobTitle || null,
          departmentId || null,
          employeeCategory || null,
          employmentType || null,
          dateOfHire || null,
          gradeId || null,
          basicSalary || null,
          shiftId || null
        ]);
      }
      
      // Insert bank details if any provided
      if (bankName || bankAccountNumber) {
        await client.query(`
          INSERT INTO bank_details (
            staff_id,
            bank_name,
            bank_account_number
          ) VALUES (
            $1, $2, $3
          )
        `, [
          staffId,
          bankName || null,
          bankAccountNumber || null
        ]);
      }
      
      // Insert employee profile if any provided
      if (cvSummary || education || workHistory || certifications || languages || skills) {
        await client.query(`
          INSERT INTO employee_profile (
            staff_id,
            cv_summary,
            education,
            work_history,
            certifications,
            languages,
            skills,
            profile_completed
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
          )
        `, [
          staffId,
          cvSummary || null,
          JSON.stringify(education || []),
          JSON.stringify(workHistory || []),
          JSON.stringify(certifications || []),
          JSON.stringify(languages || []),
          JSON.stringify(skills || []),
          (cvSummary && education && workHistory && certifications && languages && skills) ? true : false
        ]);
      }
      
      // Insert settlement rules
      await client.query(`
        INSERT INTO settlement_rules (
          staff_id,
          pension_eligible,
          pension_scheme,
          pension_start_date,
          pension_contribution_rate,
          employer_pension_rate,
          social_security_number,
          social_security_rate,
          tax_id_number,
          tax_exemption_amount,
          settlement_eligible,
          settlement_calculation_method,
          notice_period_days,
          gratuity_eligible
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
      `, [
        staffId,
        pensionEligible !== undefined ? pensionEligible : true,
        pensionScheme || 'STANDARD',
        pensionStartDate || null,
        pensionContributionRate || 5.0,
        employerPensionRate || 5.0,
        socialSecurityNumber || null,
        socialSecurityRate || 5.0,
        taxIdNumber || null,
        taxExemptionAmount || 0,
        settlementEligible !== undefined ? settlementEligible : true,
        settlementCalculationMethod || 'IRAQI_LABOR_LAW',
        noticePeriodDays || 30,
        gratuityEligible !== undefined ? gratuityEligible : true
      ]);
      
      // Insert national ID if provided
      if (nationalId) {
        await client.query(`
          INSERT INTO national_id (
            staff_id,
            national_id
          ) VALUES (
            $1, $2
          )
        `, [
          staffId,
          nationalId
        ]);
      }
      
      await client.query('COMMIT');
      
      // Get the complete staff record from the comprehensive view
      const completeStaff = await pool.query(`
        SELECT * FROM staff_complete
        WHERE staffid = $1
      `, [staffId]);
      
      console.log('Staff member created successfully:', completeStaff.rows[0]);
      
      return NextResponse.json({
        success: true,
        message: 'Staff member created successfully',
        data: completeStaff.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating staff member:', error);
    
    // Check for unique constraint violations
    if (error instanceof Error) {
      if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
        return NextResponse.json(
          { 
            error: 'Staff member with this email already exists',
            details: error.message
          },
          { status: 409 }
        );
      }
      
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { 
            error: 'Invalid workspace ID',
            details: error.message
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create staff member',
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
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { staffId, ...updateData } = body;

    if (!staffId) {
      return NextResponse.json(
        { 
          error: 'Missing staff ID',
          required: ['staffId']
        },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const fieldMapping = {
      firstName: 'firstname',
      middleName: 'middlename',
      lastName: 'lastname',
      role: 'role',
      unit: 'unit',
      specialty: 'specialty',
      phone: 'phone',
      email: 'email',
      gender: 'gender',
      maritalStatus: 'marital_status',
      nationality: 'nationality',
      address: 'address',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelationship: 'emergency_contact_relationship',
      dateOfBirth: 'dateofbirth',
      // Employment Details
      jobTitle: 'job_title',
      departmentId: 'department_id',
      employeeCategory: 'employee_category',
      employmentType: 'employment_type',
      dateOfHire: 'date_of_hire',
      gradeId: 'grade_id',
      basicSalary: 'basic_salary',
      shiftId: 'shift_id',
      bankName: 'bank_name',
      bankAccountNumber: 'bank_account_number'
    };
    
    // Settlement rules field mapping
    const settlementFieldMapping = {
      pensionEligible: 'pension_eligible',
      pensionScheme: 'pension_scheme',
      pensionStartDate: 'pension_start_date',
      pensionContributionRate: 'pension_contribution_rate',
      employerPensionRate: 'employer_pension_rate',
      socialSecurityNumber: 'social_security_number',
      socialSecurityRate: 'social_security_rate',
      taxIdNumber: 'tax_id_number',
      taxExemptionAmount: 'tax_exemption_amount',
      settlementEligible: 'settlement_eligible',
      settlementCalculationMethod: 'settlement_calculation_method',
      noticePeriodDays: 'notice_period_days',
      gratuityEligible: 'gratuity_eligible'
    };
    
    // Employee profile field mapping
    const profileFieldMapping = {
      cvSummary: 'cv_summary',
      education: 'education',
      workHistory: 'work_history',
      certifications: 'certifications',
      languages: 'languages',
      skills: 'skills'
    };
    
    // Handle different tables separately
    const { nationalId, ...updateDataWithoutNationalId } = updateData;
    
    // Staff table updates
    for (const [frontendField, dbField] of Object.entries(fieldMapping)) {
      if (updateData[frontendField] !== undefined) {
        updateFields.push(`${dbField} = $${paramIndex}`);
        updateValues.push(updateData[frontendField]);
        paramIndex++;
      }
    }
    
    // Settlement rules updates
    const settlementUpdateFields = [];
    const settlementUpdateValues = [];
    let settlementParamIndex = 1;
    
    for (const [frontendField, dbField] of Object.entries(settlementFieldMapping)) {
      if (updateData[frontendField] !== undefined) {
        settlementUpdateFields.push(`${dbField} = $${settlementParamIndex}`);
        settlementUpdateValues.push(updateData[frontendField]);
        settlementParamIndex++;
      }
    }
    
    // Employee profile updates
    const profileUpdateFields = [];
    const profileUpdateValues = [];
    let profileParamIndex = 1;
    
    for (const [frontendField, dbField] of Object.entries(profileFieldMapping)) {
      if (updateData[frontendField] !== undefined) {
        profileUpdateFields.push(`${dbField} = $${profileParamIndex}`);
        // Convert arrays to JSON strings for JSONB columns
        const value = ['education', 'workHistory', 'certifications', 'languages', 'skills'].includes(frontendField)
          ? JSON.stringify(updateData[frontendField])
          : updateData[frontendField];
        profileUpdateValues.push(value);
        profileParamIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { 
          error: 'No fields to update',
          details: 'At least one field must be provided for update'
        },
        { status: 400 }
      );
    }

    // Start transaction for multi-table updates
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update staff table if needed
      if (updateFields.length > 0) {
        updateFields.push(`updatedat = NOW()`);
        updateValues.push(staffId);
        
        const staffQuery = `
          UPDATE staff 
          SET ${updateFields.join(', ')}
          WHERE staffid = $${paramIndex}
          RETURNING *
        `;
        
        const staffResult = await client.query(staffQuery, updateValues);
        
        if (staffResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { 
              error: 'Staff member not found',
              details: `No staff member found with ID: ${staffId}`
            },
            { status: 404 }
          );
        }
      }
      
      // Update settlement rules if needed
      if (settlementUpdateFields.length > 0) {
        settlementUpdateFields.push(`updated_at = NOW()`);
        settlementUpdateValues.push(staffId);
        
        const settlementQuery = `
          UPDATE settlement_rules 
          SET ${settlementUpdateFields.join(', ')}
          WHERE staff_id = $${settlementParamIndex}
        `;
        
        await client.query(settlementQuery, settlementUpdateValues);
      }
      
      // Update employee profile if needed
      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push(`updated_at = NOW()`);
        profileUpdateValues.push(staffId);
        
        const profileQuery = `
          UPDATE employee_profile 
          SET ${profileUpdateFields.join(', ')}
          WHERE staff_id = $${profileParamIndex}
        `;
        
        await client.query(profileQuery, profileUpdateValues);
      }
      
      // Update national ID if provided
      if (nationalId !== undefined) {
        if (nationalId) {
          await client.query(`
            INSERT INTO national_id (staff_id, national_id)
            VALUES ($1, $2)
            ON CONFLICT (staff_id) 
            DO UPDATE SET 
              national_id = EXCLUDED.national_id,
              updated_at = NOW()
          `, [staffId, nationalId]);
        } else {
          await client.query(`
            DELETE FROM national_id WHERE staff_id = $1
          `, [staffId]);
        }
      }
      
      await client.query('COMMIT');
      
      // Get the complete updated record from the comprehensive view
      const completeStaff = await pool.query(`
        SELECT * FROM staff_complete
        WHERE staffid = $1
      `, [staffId]);
      
      console.log('Staff member updated successfully:', completeStaff.rows[0]);
      
      return NextResponse.json({
        success: true,
        message: 'Staff member updated successfully',
        data: completeStaff.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating staff member:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update staff member',
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
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { 
          error: 'Missing staff ID',
          required: ['staffId']
        },
        { status: 400 }
      );
    }

    // Check if staff member exists
    const existingStaff = await pool.query(
      'SELECT * FROM staff WHERE staffid = $1',
      [staffId]
    );

    if (existingStaff.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Staff member not found',
          details: `No staff member found with ID: ${staffId}`
        },
        { status: 404 }
      );
    }

    // Delete staff member
    await pool.query(
      'DELETE FROM staff WHERE staffid = $1',
      [staffId]
    );

    console.log('Staff member deleted successfully:', staffId);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting staff member:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete staff member',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
