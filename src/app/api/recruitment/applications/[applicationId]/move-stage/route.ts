import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Move application to a new pipeline stage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { newStageId, notes, movedBy } = body;

    if (!newStageId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: newStageId' },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      // Get current application
      const appResult = await client.query(
        'SELECT * FROM job_applications WHERE application_id = $1',
        [applicationId]
      );
      if (appResult.rows.length === 0) {
        throw new Error('Application not found');
      }
      const app = appResult.rows[0];
      const oldStageId = app.current_stage_id;

      // Close current stage history entry
      if (oldStageId) {
        await client.query(`
          UPDATE application_stage_history
          SET exited_at = NOW(),
              duration_hours = EXTRACT(EPOCH FROM (NOW() - entered_at)) / 3600,
              outcome = 'COMPLETED'
          WHERE application_id = $1 AND stage_id = $2 AND exited_at IS NULL
        `, [applicationId, oldStageId]);
      }

      // Get new stage details
      const stageResult = await client.query(
        'SELECT * FROM recruitment_stages WHERE stage_id = $1',
        [newStageId]
      );
      const newStage = stageResult.rows[0];

      // Determine new application status based on stage type
      let newStatus = app.status;
      if (newStage) {
        if (newStage.stage_type === 'HIRED') newStatus = 'HIRED';
        else if (newStage.stage_type === 'OFFER') newStatus = 'OFFERED';
        else if (['TECHNICAL_INTERVIEW', 'HR_INTERVIEW', 'MANAGER_INTERVIEW', 'FINAL_INTERVIEW'].includes(newStage.stage_type)) newStatus = 'INTERVIEWING';
        else if (newStage.stage_type === 'SCREENING' || newStage.stage_type === 'PHONE_SCREEN') newStatus = 'SCREENING';
        else if (newStage.stage_type === 'ASSESSMENT') newStatus = 'ASSESSMENT';
      }

      // Update application
      const updateResult = await client.query(`
        UPDATE job_applications
        SET current_stage_id = $1, status = $2, updated_at = NOW()
        WHERE application_id = $3
        RETURNING *
      `, [newStageId, newStatus, applicationId]);

      // Create new stage history entry
      await client.query(`
        INSERT INTO application_stage_history (application_id, stage_id, entered_at, outcome, moved_by, notes)
        VALUES ($1, $2, NOW(), 'IN_PROGRESS', $3, $4)
      `, [applicationId, newStageId, movedBy || null, notes || null]);

      // If hired, update hired_at
      if (newStatus === 'HIRED') {
        await client.query(
          'UPDATE job_applications SET hired_at = NOW() WHERE application_id = $1',
          [applicationId]
        );
      }

      return { application: updateResult.rows[0], newStage };
    });

    return NextResponse.json({
      success: true,
      data: result.application,
      message: `Application moved to ${result.newStage?.stage_name || 'new stage'}`,
      newStageName: result.newStage?.stage_name,
      newStageType: result.newStage?.stage_type
    });
    });
  } catch (error: any) {
    console.error('Move stage error:', error);
    const status = error.message === 'Application not found' ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to move application' },
      { status }
    );
  }
}
