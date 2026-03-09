import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const body = await request.json();
    const { approver_id, approver_name, action } = body;

    if (!approver_id || !action) {
      await pool.end();
      return NextResponse.json(
        { error: 'Missing required fields: approver_id, action' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      await pool.end();
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    // Get leave request details
    const leaveRequest = await pool.query(`
      SELECT * FROM leave_requests WHERE id = $1
    `, [id]);

    if (leaveRequest.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const request_data = leaveRequest.rows[0];

    if (request_data.status !== 'PENDING') {
      await pool.end();
      return NextResponse.json(
        { error: `Leave request is already ${request_data.status}` },
        { status: 400 }
      );
    }

    if (action === 'REJECT') {
      // Reject the leave request
      await pool.query(`
        UPDATE leave_requests 
        SET status = 'REJECTED', updated_at = NOW()
        WHERE id = $1
      `, [id]);

      await pool.end();

      return NextResponse.json({
        success: true,
        message: 'Leave request rejected',
        status: 'REJECTED'
      });
    }

    // Approve the leave request
    await pool.query(`
      UPDATE leave_requests 
      SET status = 'APPROVED', 
          approved_by = $1,
          approved_by_name = $2,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [approver_id, approver_name || 'System', id]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Leave request approved successfully',
      status: 'APPROVED'
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to process approval',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
