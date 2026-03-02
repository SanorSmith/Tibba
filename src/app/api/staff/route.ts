import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the same database as departments
const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// Generate UUID function
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


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

    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || '';
    const specialty = searchParams.get('occupation');
    const department = searchParams.get('department');

    console.log('Fetching staff from database...');
    console.log('Search term:', searchTerm);
    console.log('Specialty filter:', specialty);
    console.log('Department filter:', department);

    // Build the query with filters
    let staff;
    
    if (searchTerm || specialty || department) {
      // Build WHERE conditions
      const conditions = [];
      
      if (searchTerm) {
        conditions.push(`(
          s.firstname ILIKE '%${searchTerm}%' OR 
          s.lastname ILIKE '%${searchTerm}%' OR 
          s.email ILIKE '%${searchTerm}%' OR 
          s.phone ILIKE '%${searchTerm}%' OR
          s.role ILIKE '%${searchTerm}%'
        )`);
      }
      
      if (specialty && specialty !== 'all') {
        conditions.push(`s.specialty = '${specialty}'`);
      }
      
      if (department && department !== 'all') {
        conditions.push(`s.unit = '${department}'`);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      staff = await pool.query(`
        SELECT 
          s.staffid,
          s.firstname,
          s.middlename,
          s.lastname,
          s.role,
          s.unit,
          s.specialty,
          s.phone,
          s.email,
          s.workspaceid,
          s.createdat,
          s.updatedat
        FROM staff s
        ${whereClause}
        ORDER BY s.firstname ASC, s.lastname ASC
        LIMIT 100
      `);
    } else {
      // No filters - get all staff
      staff = await pool.query(`
        SELECT 
          s.staffid,
          s.firstname,
          s.middlename,
          s.lastname,
          s.role,
          s.unit,
          s.specialty,
          s.phone,
          s.email,
          s.workspaceid,
          s.createdat,
          s.updatedat
        FROM staff s
        ORDER BY s.firstname ASC, s.lastname ASC
        LIMIT 100
      `);
    }

    console.log(`Found ${staff.rows.length} staff members from database`);

    return NextResponse.json({ 
      staff: staff.rows,
      count: staff.rows.length 
    });

  } catch (error) {
    console.error('Error fetching staff from database:', error);
    console.error('Database URL:', databaseUrl ? 'SET' : 'NOT SET');
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
    
    // Check if it's a connection error
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('connection') ||
          error.message.includes('authentication')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: error.message
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('does not exist') || 
          error.message.includes('relation "staff" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Staff table not found',
            details: 'The staff table does not exist in the database',
            suggestion: 'Please create the staff table first'
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff',
        details: error instanceof Error ? error.message : 'Unknown error',
        staff: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

// POST /api/staff - Create new staff member
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
      workspaceId
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['firstName', 'lastName', 'email', 'phone']
        },
        { status: 400 }
      );
    }

    // Generate staff ID
    const staffId = generateUUID();
    
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
        createdat,
        updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
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
      email
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
      
      if (error.message.includes('does not exist') || 
          error.message.includes('relation "staff" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Staff table not found',
            details: 'The staff table does not exist in the database',
            suggestion: 'Please create the staff table first'
          },
          { status: 404 }
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

// PUT /api/staff - Update staff member
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
    const { staffId, ...updateData } = body;

    if (!staffId) {
      return NextResponse.json(
        { 
          error: 'Staff ID is required',
          required: ['staffId']
        },
        { status: 400 }
      );
    }

    console.log('Updating staff member:', staffId, updateData);

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Only include fields that are provided
    if (updateData.firstName !== undefined) {
      updateFields.push(`firstname = $${paramIndex++}`);
      updateValues.push(updateData.firstName);
    }
    if (updateData.middleName !== undefined) {
      updateFields.push(`middlename = $${paramIndex++}`);
      updateValues.push(updateData.middleName);
    }
    if (updateData.lastName !== undefined) {
      updateFields.push(`lastname = $${paramIndex++}`);
      updateValues.push(updateData.lastName);
    }
    if (updateData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updateData.email);
    }
    if (updateData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(updateData.phone);
    }
    if (updateData.role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(updateData.role);
    }
    if (updateData.unit !== undefined) {
      updateFields.push(`unit = $${paramIndex++}`);
      updateValues.push(updateData.unit);
    }
    if (updateData.specialty !== undefined) {
      updateFields.push(`specialty = $${paramIndex++}`);
      updateValues.push(updateData.specialty);
    }
    if (updateData.workspaceId !== undefined) {
      updateFields.push(`workspaceid = $${paramIndex++}`);
      updateValues.push(updateData.workspaceId);
    }

    // Always update the updatedat timestamp
    updateFields.push(`updatedat = NOW()`);
    updateValues.push(staffId); // Add staffId as the last parameter for WHERE clause

    if (updateFields.length === 1) { // Only updatedat field
      return NextResponse.json(
        { 
          error: 'No valid fields to update',
          message: 'Please provide at least one field to update'
        },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE staff 
      SET ${updateFields.join(', ')}
      WHERE staffid = $${paramIndex}
      RETURNING *
    `;

    const updatedStaff = await pool.query(updateQuery, updateValues);

    if (updatedStaff.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Staff member not found',
          details: `No staff member found with ID: ${staffId}`
        },
        { status: 404 }
      );
    }

    console.log('Staff member updated successfully:', updatedStaff.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
      data: updatedStaff.rows[0]
    });

  } catch (error) {
    console.error('Error updating staff member:', error);
    
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
    }

    return NextResponse.json(
      { 
        error: 'Failed to update staff member',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/staff - Delete staff member
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

    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { 
          error: 'Staff ID is required',
          required: ['staffId']
        },
        { status: 400 }
      );
    }

    console.log('Deleting staff member:', staffId);

    // First check if staff member exists
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

    // Delete the staff member
    const deletedStaff = await pool.query(
      'DELETE FROM staff WHERE staffid = $1 RETURNING *',
      [staffId]
    );

    console.log('Staff member deleted successfully:', deletedStaff.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
      data: deletedStaff.rows[0]
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
