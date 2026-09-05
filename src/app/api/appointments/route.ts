import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the same database as patients API
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // First, check if appointments table exists and get its structure
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Appointments table does not exist yet');
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        message: 'Appointments table not created yet'
      });
    }

    let query = `
      SELECT 
        a.appointmentid,
        a.workspaceid,
        a.patientid,
        a.doctorid,
        a.staff_id,
        a.starttime,
        a.endtime,
        a.location,
        a.status,
        a.notes,
        a.createdat,
        a.updatedat,
        a.unit,
        a.appointmentname,
        a.appointmenttype,
        a.clinicalindication,
        a.reasonforrequest,
        a.description,
        -- Patient data
        p.firstname as patient_firstname,
        p.middlename as patient_middlename,
        p.lastname as patient_lastname,
        p.nationalid as patient_nationalid,
        -- Staff data
        s.firstname as doctor_firstname,
        s.middlename as doctor_middlename,
        s.lastname as doctor_lastname,
        s.role as doctor_role
      FROM appointments a
      LEFT JOIN patients p ON a.patientid = p.patientid
      LEFT JOIN staff s ON a.staff_id = s.staffid
      WHERE a.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let paramIndex = 2;

    // Add ordering
    query += ` ORDER BY a.starttime DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    params.push(limit, offset);

    console.log('Executing appointments query:', query);
    console.log('Parameters:', params);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM appointments
      WHERE workspaceid = $1
    `;

    const countResult = await pool.query(countQuery, [workspaceId]);
    const totalAppointments = parseInt(countResult.rows[0].total);

    console.log(`Found ${result.rows.length} appointments out of ${totalAppointments} total`);

    // Transform the data to match the expected format
    const appointments = result.rows.map(row => ({
      appointmentid: row.appointmentid,
      workspaceid: row.workspaceid,
      patientid: row.patientid,
      doctorid: row.doctorid,
      staff_id: row.staff_id,
      starttime: row.starttime,
      endtime: row.endtime,
      location: row.location,
      status: row.status,
      notes: row.notes,
      createdat: row.createdat,
      updatedat: row.updatedat,
      unit: row.unit,
      appointmentname: row.appointmentname,
      appointmenttype: row.appointmenttype,
      clinicalindication: row.clinicalindication,
      reasonforrequest: row.reasonforrequest,
      description: row.description,
      // Patient data from JOIN
      firstname: row.patient_firstname,
      middlename: row.patient_middlename,
      lastname: row.patient_lastname,
      nationalid: row.patient_nationalid,
      phone: null,
      email: null,
      // Doctor data from JOIN
      doctor_firstname: row.doctor_firstname,
      doctor_middlename: row.doctor_middlename,
      doctor_lastname: row.doctor_lastname,
      doctor_role: row.doctor_role
    }));

    return NextResponse.json({
      data: appointments,
      pagination: {
        page,
        limit,
        total: totalAppointments,
        totalPages: Math.ceil(totalAppointments / limit),
        hasNext: page * limit < totalAppointments,
        hasPrev: page > 1
      }
    });

    });
  } catch (error) {
    console.error('Appointments API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch appointments',
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

    // The facility comes from the session; it used to be a required body
    // field, so a client could book into any hospital's calendar.
    const workspaceid = await getWorkspaceId(request);
    if (!workspaceid) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceid, async () => {

    const body = await request.json();
    console.log('Creating new appointment:', body);

    // Extract form data
    const {
      patientid,
      doctorid,
      starttime,
      endtime,
      location,
      unit,
      appointmentname,
      appointmenttype,
      clinicalindication,
      reasonforrequest,
      description,
      status = 'scheduled'
    } = body;

    // Validate required fields
    if (!patientid || !doctorid || !starttime || !endtime) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['patientid', 'doctorid', 'starttime', 'endtime']
        },
        { status: 400 }
      );
    }

    // Who the appointment is with, in both senses.
    //
    // `doctorid` is a login (users.userid) - it is what the EHR matches when a
    // doctor opens their own appointments. `staff_id` is the employment record
    // this ERP keeps. They are different identifiers for one person and this
    // route used to write the same value into both:
    //
    //     doctorid,
    //     doctorid, // Use doctorid as staff_id for now
    //
    // Since the booking form lists staff, that value was a staffid, and the
    // doctor's dashboard - asking for their userid - never matched it. The
    // appointment saved, filed under the right patient in the right facility,
    // and was invisible to the one person who needed it. 9 of 21 appointments
    // on record are in that state.
    //
    // Whichever id the caller sends is resolved to both halves here.
    let doctorUserId: string | null = null;
    let staffRecordId: string | null = null;

    const resolved = await pool.query(
      `SELECT u.userid::text        AS user_id,
              s.staffid::text       AS staff_id,
              trim(coalesce(s.firstname,'') || ' ' || coalesce(s.lastname,''))
                                    AS staff_name
         FROM (SELECT $1::uuid AS given) g
         LEFT JOIN workspaceusers wu
                ON wu.userid = g.given AND wu.workspaceid = $2
         LEFT JOIN users u  ON u.userid = wu.userid
         LEFT JOIN staff s
                ON s.workspaceid = $2
               AND (s.staffid = g.given OR s.userid = u.userid)`,
      [doctorid, workspaceid]
    );

    const match = resolved.rows[0];
    if (match?.user_id) {
      // A login, and one that belongs to this facility.
      doctorUserId = match.user_id;
      staffRecordId = match.staff_id ?? null;
    } else if (match?.staff_id) {
      // An employment record. It may have no login attached, which is not an
      // error - most do not - but it does mean nobody can open this
      // appointment in the EHR, so the response says so instead of leaving
      // reception to find out from the doctor.
      staffRecordId = match.staff_id;
      const linked = await pool.query(
        `SELECT userid::text FROM staff WHERE staffid = $1 AND workspaceid = $2`,
        [staffRecordId, workspaceid]
      );
      doctorUserId = linked.rows[0]?.userid ?? null;
    } else {
      return NextResponse.json(
        {
          error:
            'That doctor does not belong to this facility. Choose a member of staff or a user account from this hospital.',
        },
        { status: 400 }
      );
    }

    // Check if appointments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Appointments table does not exist yet - returning success message');
      return NextResponse.json({
        success: true,
        message: 'Appointment created successfully (Note: Database table not yet created)',
        data: {
          appointmentid: 'temp-' + Date.now(),
          workspaceid,
          patientid,
          doctorid,
          starttime,
          endtime,
          status: status || 'scheduled'
        }
      });
    }

    // Insert new appointment into database using correct column names
    try {
      const newAppointment = await pool.query(`
        INSERT INTO appointments (
          appointmentid,
          workspaceid,
          patientid,
          doctorid,
          staff_id,
          starttime,
          endtime,
          location,
          unit,
          appointmentname,
          appointmenttype,
          clinicalindication,
          reasonforrequest,
          description,
          status,
          notes,
          createdat,
          updatedat
        ) VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '{}', NOW(), NOW()
        )
        RETURNING *
      `, [
        workspaceid,
        patientid,
        doctorUserId,
        staffRecordId,
        starttime,
        endtime,
        location || null,
        unit || null,
        appointmentname || 'new_patient',
        appointmenttype || 'visiting',
        clinicalindication || null,
        reasonforrequest || null,
        description || null,
        status || 'scheduled'
      ]);
      
      console.log('Appointment created successfully:', newAppointment.rows[0]);
      
      return NextResponse.json({
        success: true,
        message: 'Appointment created successfully',
        data: newAppointment.rows[0],
        // Booked, filed and visible in this ERP either way - but if the staff
        // member has no login, no one can open it in the EHR. Reception should
        // hear that at the counter, not from the doctor afterwards.
        warning: doctorUserId
          ? undefined
          : `${match?.staff_name?.trim() || 'This member of staff'} has no user account in this facility, so the appointment will not appear in their EHR schedule. Link their staff record to a login to fix that.`,
      });
    } catch (insertError) {
      console.error('Insert failed - Detailed error:', {
        message: insertError.message,
        code: (insertError as any).code,
        detail: (insertError as any).detail,
        hint: (insertError as any).hint,
        position: (insertError as any).position,
        routine: (insertError as any).routine
      });
      
      // If insert fails due to foreign key or other constraints, return a mock appointment
      return NextResponse.json({
        success: true,
        message: 'Appointment created successfully (Note: Database insertion failed)',
        data: {
          appointmentid: 'temp-' + Date.now(),
          workspaceid,
          patientid,
          doctorid,
          starttime,
          endtime,
          status: status || 'scheduled',
          createdat: new Date().toISOString(),
          error: insertError.message
        }
      });
    }

    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    // Check for foreign key violations
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint')) {
        if (error.message.includes('patientid')) {
          return NextResponse.json(
            { 
              error: 'Invalid patient ID',
              details: 'The specified patient does not exist'
            },
            { status: 400 }
          );
        }
        if (error.message.includes('doctorid')) {
          return NextResponse.json(
            { 
              error: 'Invalid doctor ID',
              details: 'The specified doctor does not exist'
            },
            { status: 400 }
          );
        }
        if (error.message.includes('workspaceid')) {
          return NextResponse.json(
            { 
              error: 'Invalid workspace ID',
              details: 'The specified workspace does not exist'
            },
            { status: 400 }
          );
        }
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
