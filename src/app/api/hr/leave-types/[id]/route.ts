import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch single leave type by ID
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      'SELECT * FROM leave_types WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Leave type not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching leave type:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch leave type',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Update leave type
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if leave type exists
    const checkResult = await pool.query(
      'SELECT id FROM leave_types WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Leave type not found',
        },
        { status: 404 }
      );
    }

    // Check for duplicate code (excluding current record)
    if (body.code) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM leave_types WHERE code = $1 AND id != $2',
        [body.code, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Leave type code already exists',
          },
          { status: 409 }
        );
      }
    }

    const query = `
      UPDATE leave_types
      SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        code = COALESCE($3, code),
        description = COALESCE($4, description),
        description_ar = COALESCE($5, description_ar),
        max_days_per_year = COALESCE($6, max_days_per_year),
        is_paid = COALESCE($7, is_paid),
        requires_approval = COALESCE($8, requires_approval),
        min_notice_days = COALESCE($9, min_notice_days),
        max_consecutive_days = COALESCE($10, max_consecutive_days),
        accrual_frequency = COALESCE($11, accrual_frequency),
        accrual_rate = COALESCE($12, accrual_rate),
        carry_forward_allowed = COALESCE($13, carry_forward_allowed),
        carry_forward_limit = COALESCE($14, carry_forward_limit),
        color = COALESCE($15, color),
        icon = COALESCE($16, icon),
        sort_order = COALESCE($17, sort_order),
        is_active = COALESCE($18, is_active),
        updated_at = NOW(),
        updated_by = COALESCE($19, updated_by)
      WHERE id = $20
      RETURNING *
    `;

    const values = [
      body.name || null,
      body.nameAr || null,
      body.code || null,
      body.description || null,
      body.descriptionAr || null,
      body.maxDaysPerYear !== undefined ? body.maxDaysPerYear : null,
      body.isPaid !== undefined ? body.isPaid : null,
      body.requiresApproval !== undefined ? body.requiresApproval : null,
      body.minNoticeDays !== undefined ? body.minNoticeDays : null,
      body.maxConsecutiveDays !== undefined ? body.maxConsecutiveDays : null,
      body.accrualFrequency || null,
      body.accrualRate !== undefined ? body.accrualRate : null,
      body.carryForwardAllowed !== undefined ? body.carryForwardAllowed : null,
      body.carryForwardLimit !== undefined ? body.carryForwardLimit : null,
      body.color || null,
      body.icon || null,
      body.sortOrder !== undefined ? body.sortOrder : null,
      body.isActive !== undefined ? body.isActive : null,
      body.updatedBy || 'system',
      id,
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Leave type updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating leave type:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update leave type',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete leave type
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if leave type exists
    const checkResult = await pool.query(
      'SELECT id FROM leave_types WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Leave type not found',
        },
        { status: 404 }
      );
    }

    // Check if leave type is being used in leave requests
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM leave_requests WHERE leave_type_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete leave type that is being used in leave requests',
          message: 'Please deactivate instead of deleting',
        },
        { status: 409 }
      );
    }

    // Delete the leave type
    await pool.query('DELETE FROM leave_types WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Leave type deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting leave type:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete leave type',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
