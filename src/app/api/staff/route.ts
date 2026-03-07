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
      workspaceId
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !unit || !specialty || !dateOfBirth) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['firstName', 'lastName', 'email', 'phone', 'unit', 'specialty', 'dateOfBirth']
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

    // Insert new staff member
    const newStaff = await pool.query(`
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
        createdat,
        updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
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
      customStaffId
    ]);

    console.log('Staff member created successfully:', newStaff.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Staff member created successfully',
      data: newStaff.rows[0]
    });

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
      email: 'email'
    };

    for (const [frontendField, dbField] of Object.entries(fieldMapping)) {
      if (updateData[frontendField] !== undefined) {
        updateFields.push(`${dbField} = $${paramIndex}`);
        updateValues.push(updateData[frontendField]);
        paramIndex++;
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

    updateFields.push(`updatedat = NOW()`);
    updateValues.push(staffId);

    const query = `
      UPDATE staff 
      SET ${updateFields.join(', ')}
      WHERE staffid = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Staff member not found',
          details: `No staff member found with ID: ${staffId}`
        },
        { status: 404 }
      );
    }

    console.log('Staff member updated successfully:', result.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
      data: result.rows[0]
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
