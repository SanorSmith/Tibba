import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

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

    // Staff rosters are facility-private — this route returned every
    // facility's staff to every caller.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || '';
    const specialty = searchParams.get('occupation');
    const department = searchParams.get('department');
    const staffId = searchParams.get('id');

    // If staffId is provided, return individual staff member
    if (staffId) {
      console.log('Fetching individual staff member:', staffId);

      const query = `
        SELECT 
          -- Staff table (basic info)
          s.staffid as id,
          s.firstname as "firstName",
          s.middlename as "middleName", 
          s.lastname as "lastName",
          s.email,
          s.phone,
          s.role,
          s.unit,
          s.specialty,
          s.dateofbirth as "dateOfBirth",
          s.custom_staff_id as "customStaffId",
          s.gender,
          s.marital_status as "maritalStatus",
          s.nationality,
          s.address,
          s.emergency_contact_name as "emergencyContactName",
          s.emergency_contact_phone as "emergencyContactPhone",
          s.emergency_contact_relationship as "emergencyContactRelationship",
          s.createdat as "createdAt",
          s.updatedat as "updatedAt",
          
          -- Employment details
          ed.job_title as "jobTitle",
          ed.department_id as "departmentId",
          ed.employee_category as "employeeCategory",
          ed.employment_type as "employmentType",
          ed.date_of_hire as "dateOfHire",
          ed.grade_id as "gradeId",
          ed.basic_salary as "basicSalary",
          ed.shift_id as "shiftId",
          
          -- Bank details
          bd.bank_name as "bankName",
          bd.bank_account_number as "bankAccountNumber",
          
          -- Employee profile
          ep.cv_summary as "cvSummary",
          ep.education,
          ep.work_history,
          ep.certifications,
          ep.languages,
          ep.skills,
          
          -- Settlement rules
          sr.pension_eligible as "pensionEligible",
          sr.pension_scheme as "pensionScheme",
          sr.pension_start_date as "pensionStartDate",
          sr.pension_contribution_rate as "pensionContributionRate",
          sr.employer_pension_rate as "employerPensionRate",
          sr.social_security_number as "socialSecurityNumber",
          sr.social_security_rate as "socialSecurityRate",
          sr.tax_id_number as "taxIdNumber",
          sr.tax_exemption_amount as "taxExemptionAmount",
          sr.settlement_eligible as "settlementEligible",
          sr.settlement_calculation_method as "settlementCalculationMethod",
          sr.notice_period_days as "noticePeriodDays",
          sr.gratuity_eligible as "gratuityEligible",
          
          -- National ID
          nid.national_id as "nationalId",

          -- The platform account this employment record belongs to, and the
          -- role that account actually holds in this facility. The job title
          -- in s.role is what HR calls them; this is what they may open.
          s.userid as "userId",
          u.email as "loginEmail",
          u.name as "loginName",
          wu.role as "platformRole"
          
        FROM staff s
        LEFT JOIN employment_details ed ON s.staffid = ed.staff_id
        LEFT JOIN bank_details bd ON s.staffid = bd.staff_id  
        LEFT JOIN employee_profile ep ON s.staffid = ep.staff_id
        LEFT JOIN settlement_rules sr ON s.staffid = sr.staff_id
        LEFT JOIN national_id nid ON s.staffid = nid.staff_id
        LEFT JOIN users u ON u.userid = s.userid
        LEFT JOIN workspaceusers wu
               ON wu.userid = s.userid AND wu.workspaceid = s.workspaceid
        WHERE s.staffid = $1 AND s.workspaceid = $2
      `;

      const result = await pool.query(query, [staffId, workspaceId]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { 
            error: 'Staff member not found',
            details: `No staff member found with ID: ${staffId}`
          },
          { status: 404 }
        );
      }

      console.log('Staff member fetched successfully:', result.rows[0]);

      return NextResponse.json({
        success: true,
        staff: result.rows[0]
      });
    }

    // Otherwise, return all staff with filters
    console.log('Fetching staff from database...');
    console.log('Search term:', searchTerm);
    console.log('Specialty filter:', specialty);
    console.log('Department filter:', department);

    // Who a staff member is, and - separately - what they may sign in as.
    //
    // `staff.role` is a job title typed into this app: "Doctor", "Nurse",
    // "ADMINISTRATIVE", "gf", "tttt". It grants nothing and never did. What
    // decides whether someone can log in, and to which facility, is their
    // membership in `workspaceusers` - the platform's own record, the one the
    // Users screen manages.
    //
    // Those two had no connection at all until `staff.userid` (migration 004),
    // which is why the same person could be a doctor on the platform and
    // ADMINISTRATIVE here at the same time, and why an appointment booked
    // against a staff row never reached anyone's dashboard.
    //
    // `platformRole` is the authoritative one and comes from the membership.
    // `userId` null means this employment record has no login yet: nothing is
    // broken, but nobody can act as that person in the EHR.
    let query = `
      SELECT 
        s.staffid as id,
        s.firstname as "firstName",
        s.middlename as "middleName",
        s.lastname as "lastName",
        s.email,
        s.phone,
        s.role,
        s.unit,
        s.specialty,
        s.dateofbirth as "dateOfBirth",
        s.custom_staff_id as "customStaffId",
        s.createdat as "createdAt",
        s.updatedat as "updatedAt",
        s.userid as "userId",
        u.email as "loginEmail",
        u.name as "loginName",
        wu.role as "platformRole"
      FROM staff s
      LEFT JOIN users u ON u.userid = s.userid
      LEFT JOIN workspaceusers wu
             ON wu.userid = s.userid AND wu.workspaceid = s.workspaceid
      WHERE s.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (searchTerm) {
      query += ` AND (
        s.firstname ILIKE $${paramIndex} OR 
        s.lastname ILIKE $${paramIndex} OR 
        s.email ILIKE $${paramIndex} OR 
        s.role ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (specialty) {
      query += ` AND s.specialty ILIKE $${paramIndex}`;
      params.push(`%${specialty}%`);
      paramIndex++;
    }

    if (department) {
      query += ` AND s.unit ILIKE $${paramIndex}`;
      params.push(`%${department}%`);
      paramIndex++;
    }

    query += ` ORDER BY s.lastname, s.firstname`;

    const result = await pool.query(query, params);

    console.log('Staff query executed successfully');
    console.log('Found', result.rows.length, 'staff members');

    return NextResponse.json({
      success: true,
      staff: result.rows,
      count: result.rows.length
    });

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
    const sessionWorkspaceId = await getWorkspaceId(request);
    if (!sessionWorkspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(sessionWorkspaceId, async () => {
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
      // The login this employment record belongs to. Optional: plenty of staff
      // have no account, and an unlinked record is a person who simply cannot
      // sign in yet - not an error.
      userId
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

    // Is this person already on the books here?
    //
    // Migration 005 makes it impossible to register them twice, but a unique
    // index answers with a constraint violation, and the caller deserves to
    // know *who* they have collided with - the whole difficulty with the two
    // Sanor Smith records in Hospital 1 was that neither screen ever mentioned
    // the other. Asking first turns "duplicate key" into a name and a staff
    // number.
    //
    // Per facility, because working at two hospitals is ordinary. Trimmed and
    // lowercased, to match the index.
    const emailClash = await pool.query(
      `SELECT staffid, firstname, lastname, custom_staff_id
         FROM staff
        WHERE workspaceid = $1
          AND email IS NOT NULL
          AND lower(trim(email)) = lower(trim($2))
        LIMIT 1`,
      [sessionWorkspaceId, email],
    );
    if (emailClash.rows.length > 0) {
      const found = emailClash.rows[0];
      return NextResponse.json(
        {
          error: `${found.firstname} ${found.lastname} is already registered in this facility with the email ${email}${found.custom_staff_id ? ` (staff ID ${found.custom_staff_id})` : ''}. Edit that record instead of creating a second one.`,
          conflict: 'email',
          existingStaffId: found.staffid,
        },
        { status: 409 },
      );
    }

    if (nationalId && String(nationalId).trim() !== '') {
      const nidClash = await pool.query(
        `SELECT s.staffid, s.firstname, s.lastname, s.custom_staff_id
           FROM national_id n
           JOIN staff s ON s.staffid = n.staff_id
          WHERE n.workspaceid = $1
            AND lower(trim(n.national_id)) = lower(trim($2))
          LIMIT 1`,
        [sessionWorkspaceId, String(nationalId)],
      );
      if (nidClash.rows.length > 0) {
        const found = nidClash.rows[0];
        return NextResponse.json(
          {
            error: `That national ID already belongs to ${found.firstname} ${found.lastname} in this facility${found.custom_staff_id ? ` (staff ID ${found.custom_staff_id})` : ''}. Two staff records for one person is what this prevents.`,
            conflict: 'nationalId',
            existingStaffId: found.staffid,
          },
          { status: 409 },
        );
      }
    }

    // Generate staff IDs
    const staffId = generateUUID(); // Primary key (UUID)
    const customStaffId = generateStaffId(unit, specialty, dateOfBirth); // Custom format
    console.log('✅ Generated UUID:', staffId);
    console.log('✅ Generated Custom ID:', customStaffId);
    
    // New staff belong to the facility of whoever is creating them. This used
    // to take workspaceId from the request body, and when absent it picked an
    // arbitrary facility (SELECT ... LIMIT 1) or invented a new one, so staff
    // could land in a hospital the creator has nothing to do with.
    const defaultWorkspaceId = sessionWorkspaceId;

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
          userid,
          createdat,
          updatedat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
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
        dateOfBirth,
        // The platform account, when one was chosen. The database refuses an
        // account belonging to another facility (trigger, migration 004), so a
        // bad id here fails the insert rather than quietly crossing a boundary.
        userId || null
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
            shift_id,
            workspaceid
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
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
          shiftId || null,
          sessionWorkspaceId
        ]);
      }
      
      // Insert bank details if any provided
      if (bankName || bankAccountNumber) {
        await client.query(`
          INSERT INTO bank_details (
            staff_id,
            bank_name,
            bank_account_number,
            workspaceid
          ) VALUES (
            $1, $2, $3, $4
          )
        `, [
          staffId,
          bankName || null,
          bankAccountNumber || null,
          sessionWorkspaceId
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
            profile_completed,
            workspaceid
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
        `, [
          staffId,
          cvSummary || null,
          JSON.stringify(education || []),
          JSON.stringify(workHistory || []),
          JSON.stringify(certifications || []),
          JSON.stringify(languages || []),
          JSON.stringify(skills || []),
          (cvSummary && education && workHistory && certifications && languages && skills) ? true : false,
          sessionWorkspaceId
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
          gratuity_eligible,
          workspaceid
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
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
        gratuityEligible !== undefined ? gratuityEligible : true,
        sessionWorkspaceId
      ]);
      
      // Insert national ID if provided
      if (nationalId) {
        await client.query(`
          INSERT INTO national_id (
            staff_id,
            national_id,
            workspaceid
          ) VALUES (
            $1, $2, $3
          )
        `, [
          staffId,
          nationalId,
          sessionWorkspaceId
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

    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    
    // Check for unique constraint violations
    if (error instanceof Error) {
      // Reached only when two requests race past the check above; the index
      // from migration 005 is what actually decides. Until that index existed
      // this branch was unreachable and its message was a guess.
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
    const updateWorkspaceId = await getWorkspaceId(request);
    if (!updateWorkspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(updateWorkspaceId, async () => {
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

    // The same two questions the create path asks, for the same reason - with
    // one addition: exclude the record being edited, or saving a form without
    // touching the email would report the person as a duplicate of themselves.
    if (updateData.email && String(updateData.email).trim() !== '') {
      const clash = await pool.query(
        `SELECT staffid, firstname, lastname, custom_staff_id
           FROM staff
          WHERE workspaceid = $1
            AND staffid <> $2
            AND email IS NOT NULL
            AND lower(trim(email)) = lower(trim($3))
          LIMIT 1`,
        [updateWorkspaceId, staffId, String(updateData.email)],
      );
      if (clash.rows.length > 0) {
        const found = clash.rows[0];
        return NextResponse.json(
          {
            error: `${found.firstname} ${found.lastname} already uses ${updateData.email} in this facility${found.custom_staff_id ? ` (staff ID ${found.custom_staff_id})` : ''}. Two staff records for one person is what this prevents.`,
            conflict: 'email',
            existingStaffId: found.staffid,
          },
          { status: 409 },
        );
      }
    }

    if (updateData.nationalId && String(updateData.nationalId).trim() !== '') {
      const clash = await pool.query(
        `SELECT s.staffid, s.firstname, s.lastname, s.custom_staff_id
           FROM national_id n
           JOIN staff s ON s.staffid = n.staff_id
          WHERE n.workspaceid = $1
            AND n.staff_id <> $2
            AND lower(trim(n.national_id)) = lower(trim($3))
          LIMIT 1`,
        [updateWorkspaceId, staffId, String(updateData.nationalId)],
      );
      if (clash.rows.length > 0) {
        const found = clash.rows[0];
        return NextResponse.json(
          {
            error: `That national ID already belongs to ${found.firstname} ${found.lastname} in this facility${found.custom_staff_id ? ` (staff ID ${found.custom_staff_id})` : ''}.`,
            conflict: 'nationalId',
            existingStaffId: found.staffid,
          },
          { status: 409 },
        );
      }
    }

    // This handler also writes side tables (employment_details, bank_details,
    // settlement_rules, …) keyed only by staff_id, so confirm the employee is
    // ours before touching any of them.
    const owns = await pool.query(
      'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [staffId, updateWorkspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json(
        { error: 'Staff member not found', details: `No staff member found with ID: ${staffId}` },
        { status: 404 }
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
      // The platform account this record belongs to. Send null to unlink.
      // Membership is enforced in the database (migration 004), so a login
      // from another facility is refused rather than accepted quietly.
      userId: 'userid',
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
          WHERE staffid = $${paramIndex} AND workspaceid = $${paramIndex + 1}
          RETURNING *
        `;
        updateValues.push(updateWorkspaceId);
        
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
            INSERT INTO national_id (staff_id, national_id, workspaceid)
            VALUES ($1, $2, $3)
            ON CONFLICT (staff_id) 
            DO UPDATE SET 
              national_id = EXCLUDED.national_id,
              updated_at = NOW()
          `, [staffId, nationalId, updateWorkspaceId]);
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

    });
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

    const deleteWorkspaceId = await getWorkspaceId(request);
    if (!deleteWorkspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(deleteWorkspaceId, async () => {

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

    // Check the staff member exists *in this facility*. Without the workspace
    // filter, one hospital could delete another's employee by id.
    const existingStaff = await pool.query(
      'SELECT * FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [staffId, deleteWorkspaceId]
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
      'DELETE FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [staffId, deleteWorkspaceId]
    );

    console.log('Staff member deleted successfully:', staffId);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    });

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
