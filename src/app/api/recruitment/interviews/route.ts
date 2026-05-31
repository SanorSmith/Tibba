import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// GET - List interviews with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const applicationId = searchParams.get('applicationId');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');

    let sql = `
      SELECT 
        i.*,
        a.application_number,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        v.position as vacancy_position,
        s.stage_name
      FROM interviews i
      LEFT JOIN job_applications a ON i.application_id = a.application_id
      LEFT JOIN job_candidates c ON a.candidate_id = c.id
      LEFT JOIN job_vacancies v ON a.vacancy_id = v.id
      LEFT JOIN recruitment_stages s ON i.stage_id = s.stage_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (workspaceId) {
      sql += ` AND i.workspace_id = $${idx++}`;
      params.push(workspaceId);
    }
    if (applicationId) {
      sql += ` AND i.application_id = $${idx++}`;
      params.push(applicationId);
    }
    if (status) {
      sql += ` AND i.status = $${idx++}`;
      params.push(status);
    }
    if (fromDate) {
      sql += ` AND i.scheduled_date >= $${idx++}`;
      params.push(fromDate);
    }

    sql += ' ORDER BY i.scheduled_date DESC, i.start_time DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Get interviews error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch interviews' },
      { status: 500 }
    );
  }
}

// POST - Schedule new interview
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      applicationId,
      stageId,
      interviewType,
      interviewRound,
      scheduledDate,
      startTime,
      endTime,
      location,
      meetingLink,
      panelMembers, // Array of { interviewerId, interviewerName, interviewerRole, isLead }
      createdBy,
    } = body;

    if (!workspaceId || !applicationId || !scheduledDate || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: workspaceId, applicationId, scheduledDate, startTime, endTime' },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      // Create interview
      const intResult = await client.query(`
        INSERT INTO interviews (
          workspace_id, application_id, stage_id, interview_type,
          interview_round, scheduled_date, start_time, end_time,
          location, meeting_link, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SCHEDULED', $11)
        RETURNING *
      `, [
        workspaceId, applicationId, stageId || null,
        interviewType || 'IN_PERSON', interviewRound || 1,
        scheduledDate, startTime, endTime,
        location || null, meetingLink || null, createdBy || null
      ]);

      const interview = intResult.rows[0];

      // Add panel members
      if (panelMembers && panelMembers.length > 0) {
        for (const member of panelMembers) {
          await client.query(`
            INSERT INTO interview_panel (
              interview_id, interviewer_id, interviewer_name,
              interviewer_role, is_lead, attendance_status
            ) VALUES ($1, $2, $3, $4, $5, 'PENDING')
          `, [
            interview.interview_id,
            member.interviewerId || null,
            member.interviewerName || null,
            member.interviewerRole || 'INTERVIEWER',
            member.isLead || false
          ]);
        }
      }

      // Update application status
      await client.query(`
        UPDATE job_applications
        SET status = 'INTERVIEWING', updated_at = NOW()
        WHERE application_id = $1 AND status NOT IN ('HIRED', 'REJECTED', 'WITHDRAWN')
      `, [applicationId]);

      return interview;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Interview scheduled successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Schedule interview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to schedule interview' },
      { status: 500 }
    );
  }
}
