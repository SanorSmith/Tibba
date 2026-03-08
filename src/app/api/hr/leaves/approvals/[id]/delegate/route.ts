import { NextRequest, NextResponse } from 'next/server';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { current_approver_id, delegate_to_id, delegate_to_name, reason } = body;
    
    if (!current_approver_id || !delegate_to_id || !delegate_to_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: current_approver_id, delegate_to_id, delegate_to_name',
      }, { status: 400 });
    }
    
    const result = await approvalWorkflow.delegateApproval(
      params.id,
      current_approver_id,
      delegate_to_id,
      delegate_to_name,
      reason
    );
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
    
  } catch (error: any) {
    console.error('Error delegating approval:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delegate approval',
    }, { status: 500 });
  }
}
