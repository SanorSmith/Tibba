import { NextRequest, NextResponse } from 'next/server';
import scheduleConflicts from '@/lib/services/schedule-conflict-checker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: employee_id, start_date, end_date',
      }, { status: 400 });
    }
    
    const conflicts = await scheduleConflicts.checkScheduleConflicts(
      employeeId,
      startDate,
      endDate
    );
    
    return NextResponse.json({
      success: true,
      data: conflicts,
    });
    
  } catch (error: any) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check conflicts',
    }, { status: 500 });
  }
}
