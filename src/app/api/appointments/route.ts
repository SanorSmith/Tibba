import { NextRequest, NextResponse } from 'next/server';

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let postgres: any;
let sql: any;

async function getDbConnection() {
  if (!postgres) {
    postgres = (await import('postgres')).default;
    sql = postgres(databaseUrl!, { 
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
    const db = await getDbConnection();
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patient_id');
    const patientid = searchParams.get('patientid'); // Support both formats
    const doctorId = searchParams.get('doctor_id');
    const doctorid = searchParams.get('doctorid'); // Support both formats
    const workspaceid = searchParams.get('workspaceid');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Use the tibbna GitHub app's column names (lowercase with no underscores)
    const finalPatientId = patientId || patientid;
    const finalDoctorId = doctorId || doctorid;

    let appointments;

    // Query with workspace filter if provided (tibbna GitHub app uses workspaceid)
    if (finalPatientId && workspaceid) {
      appointments = await db`
        SELECT a.*, p.firstname, p.middlename, p.lastname, p.nationalid, p.phone, p.email
        FROM appointments a
        LEFT JOIN patients p ON a.patientid = p.patientid
        WHERE a.patientid = ${finalPatientId} 
        AND a.workspaceid = ${workspaceid}
        ORDER BY a.starttime DESC
      `;
    } else if (finalPatientId) {
      appointments = await db`
        SELECT a.*, p.firstname, p.middlename, p.lastname, p.nationalid, p.phone, p.email
        FROM appointments a
        LEFT JOIN patients p ON a.patientid = p.patientid
        WHERE a.patientid = ${finalPatientId}
        ORDER BY a.starttime DESC
      `;
    } else if (finalDoctorId && workspaceid) {
      appointments = await db`
        SELECT a.*, p.firstname, p.middlename, p.lastname, p.nationalid, p.phone, p.email
        FROM appointments a
        LEFT JOIN patients p ON a.patientid = p.patientid
        WHERE a.doctorid = ${finalDoctorId}
        AND a.workspaceid = ${workspaceid}
        ORDER BY a.starttime DESC
      `;
    } else if (workspaceid) {
      appointments = await db`
        SELECT a.*, p.firstname, p.middlename, p.lastname, p.nationalid, p.phone, p.email
        FROM appointments a
        LEFT JOIN patients p ON a.patientid = p.patientid
        WHERE a.workspaceid = ${workspaceid}
        ORDER BY a.starttime DESC
        LIMIT 100
      `;
    } else {
      appointments = await db`
        SELECT a.*, p.firstname, p.middlename, p.lastname, p.nationalid, p.phone, p.email
        FROM appointments a
        LEFT JOIN patients p ON a.patientid = p.patientid
        ORDER BY a.starttime DESC
        LIMIT 100
      `;
    }

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDbConnection();
    const body = await request.json();
    
    // Support both naming conventions (snake_case and camelCase)
    const {
      patient_id,
      patientid,
      doctor_id,
      doctorid,
      workspaceid,
      workspace_id,
      appointment_name,
      appointmentname,
      appointment_type,
      appointmenttype,
      clinical_indication,
      clinicalindication,
      reason_for_request,
      reasonforrequest,
      description,
      start_time,
      starttime,
      end_time,
      endtime,
      location,
      unit,
      status = 'scheduled',
      notes = {}
    } = body;

    // Use tibbna GitHub app's column names (lowercase, no underscores)
    const finalPatientId = patient_id || patientid;
    const finalDoctorId = doctor_id || doctorid;
    const finalWorkspaceId = workspaceid || workspace_id;
    const finalAppointmentName = appointment_name || appointmentname || 'new_patient';
    const finalAppointmentType = appointment_type || appointmenttype || 'visiting';
    const finalClinicalIndication = clinical_indication || clinicalindication;
    const finalReasonForRequest = reason_for_request || reasonforrequest;
    const finalStartTime = start_time || starttime;
    const finalEndTime = end_time || endtime;

    if (!finalPatientId || !finalStartTime || !finalEndTime || !finalWorkspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: patientid, workspaceid, starttime, endtime' },
        { status: 400 }
      );
    }

    // Check if doctor has a user account (required for appointments)
    if (finalDoctorId) {
      const doctorCheck = await db`
        SELECT u.userid
        FROM users u
        WHERE u.userid = ${finalDoctorId}
      `;
      
      if (doctorCheck.length === 0) {
        return NextResponse.json(
          { error: 'Selected medical staff does not have a user account and cannot be assigned to appointments' },
          { status: 400 }
        );
      }
    }

    const result = await db`
      INSERT INTO appointments (
        workspaceid,
        patientid,
        doctorid,
        appointmentname,
        appointmenttype,
        clinicalindication,
        reasonforrequest,
        description,
        starttime,
        endtime,
        location,
        unit,
        status,
        notes
      ) VALUES (
        ${finalWorkspaceId},
        ${finalPatientId},
        ${finalDoctorId || null},
        ${finalAppointmentName}::appointment_name,
        ${finalAppointmentType}::appointment_type,
        ${finalClinicalIndication || null},
        ${finalReasonForRequest || null},
        ${description || null},
        ${finalStartTime},
        ${finalEndTime},
        ${location || null},
        ${unit || null},
        ${status}::appointment_status,
        ${JSON.stringify(notes)}::jsonb
      )
      RETURNING *
    `;

    return NextResponse.json({ appointment: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
