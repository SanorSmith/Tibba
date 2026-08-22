import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { PerformanceCalculator } from '@/services/performance-calculator';
import { pool } from '@/lib/db/pool';


export async function POST(request: NextRequest) {
  let calculator: PerformanceCalculator | null = null;
  
  try {
    const body = await request.json();
    const { employee_id, review_period } = body;

    // employee_id comes from the client and is handed to a calculator that
    // reads that employee's attendance and payroll history keyed by id alone.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await pool.query(
      'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [employee_id, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }
    
    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }
    
    if (!review_period || !review_period.start_date || !review_period.end_date) {
      return NextResponse.json(
        { success: false, error: 'Review period with start_date and end_date is required' },
        { status: 400 }
      );
    }
    
    calculator = new PerformanceCalculator();
    const score = await calculator.calculateAttendanceScore(employee_id, review_period);
    
    return NextResponse.json({
      success: true,
      data: score
    });
  } catch (error: any) {
    console.error('Error calculating attendance score:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate attendance score' },
      { status: 500 }
    );
  } finally {
    if (calculator) {
      await calculator.close();
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const employee_id = searchParams.get('employee_id');

  // employee_id comes from the client and is handed to a calculator that
  // reads that employee's attendance and payroll history keyed by id alone.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }
  const owns = await pool.query(
    'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
    [employee_id, workspaceId]
  );
  if (owns.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
  }
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');
  
  let calculator: PerformanceCalculator | null = null;
  
  try {
    if (!employee_id || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'employee_id, start_date, and end_date are required' },
        { status: 400 }
      );
    }
    
    calculator = new PerformanceCalculator();
    const score = await calculator.calculateAttendanceScore(employee_id, {
      start_date,
      end_date
    });
    
    return NextResponse.json({
      success: true,
      data: score
    });
  } catch (error: any) {
    console.error('Error calculating attendance score:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate attendance score' },
      { status: 500 }
    );
  } finally {
    if (calculator) {
      await calculator.close();
    }
  }
}
