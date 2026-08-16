import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getWorkspaceId } from '@/lib/workspace';
import { PayrollCalculator } from '@/services/payroll-calculator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  let calculator: PayrollCalculator | null = null;
  
  try {
    const body = await request.json();
    const { employee_id, employee_data, attendance_data, payroll_period } = body;

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
    
    if (!employee_data) {
      return NextResponse.json(
        { success: false, error: 'Employee data is required' },
        { status: 400 }
      );
    }
    
    if (!attendance_data) {
      return NextResponse.json(
        { success: false, error: 'Attendance data is required' },
        { status: 400 }
      );
    }
    
    calculator = new PayrollCalculator();
    const result = await calculator.calculateGrossSalary(
      employee_data,
      attendance_data,
      payroll_period
    );
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate payroll' },
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
  
  let calculator: PayrollCalculator | null = null;
  
  try {
    if (!employee_id || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'employee_id, start_date, and end_date are required' },
        { status: 400 }
      );
    }
    
    calculator = new PayrollCalculator();
    const exceptions = await calculator.getAttendanceExceptions(employee_id, start_date, end_date);
    const bonusPercentage = calculator.calculateAttendanceBonus(exceptions);
    const recommendation = calculator.generatePayrollRecommendation(exceptions);
    
    return NextResponse.json({
      success: true,
      data: {
        exceptions,
        bonus_percentage: bonusPercentage,
        recommendation
      }
    });
  } catch (error: any) {
    console.error('Error fetching attendance impact:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch attendance impact' },
      { status: 500 }
    );
  } finally {
    if (calculator) {
      await calculator.close();
    }
  }
}
