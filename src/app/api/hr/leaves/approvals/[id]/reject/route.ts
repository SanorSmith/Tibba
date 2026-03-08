import { NextRequest, NextResponse } from 'next/server';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { approver_id, approver_name, rejection_reason } = body;
    
    if (!approver_id || !approver_name || !rejection_reason) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: approver_id, approver_name, rejection_reason',
      }, { status: 400 });
    }
    
    const result = await approvalWorkflow.rejectLeaveRequest(
      params.id,
      approver_id,
      approver_name,
      rejection_reason
    );
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
    
  } catch (error: any) {
    console.error('Error rejecting leave request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to reject leave request',
    }, { status: 500 });
  }
}
