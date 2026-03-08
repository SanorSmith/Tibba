import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const month = searchParams.get('month'); // Format: YYYY-MM
    const year = searchParams.get('year');

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'staffId parameter is required' },
        { status: 400 }
      );
    }

    // Build date filter
    let dateFilter = '';
    const params: any[] = [staffId];
    
    if (month && year) {
      dateFilter = `AND DATE_TRUNC('month', timestamp) = $2`;
      params.push(`${year}-${month}-01`);
    } else if (year) {
      dateFilter = `AND EXTRACT(YEAR FROM timestamp) = $2`;
      params.push(year);
    }

    // Get attendance transactions for the staff member
    const query = `
      SELECT 
        id,
        employee_id,
        employee_name,
        employee_number,
        transaction_type,
        timestamp,
        device_type,
        device_id,
        source,
        is_valid,
        validation_status,
        created_at
      FROM attendance_transactions 
      WHERE employee_id = $1 ${dateFilter}
      ORDER BY timestamp DESC
    `;

    const result = await pool.query(query, params);

    // Group transactions by date
    const groupedTransactions: { [key: string]: any[] } = {};
    
    result.rows.forEach(transaction => {
      const date = new Date(transaction.timestamp).toISOString().split('T')[0];
      if (!groupedTransactions[date]) {
        groupedTransactions[date] = [];
      }
      groupedTransactions[date].push({
        ...transaction,
        time: new Date(transaction.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      });
    });

    // Sort dates in descending order
    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Format the response
    const attendanceRecords = sortedDates.map(date => ({
      date,
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      transactions: groupedTransactions[date].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      summary: {
        totalTransactions: groupedTransactions[date].length,
        checkIns: groupedTransactions[date].filter(t => t.transaction_type === 'IN').length,
        checkOuts: groupedTransactions[date].filter(t => t.transaction_type === 'OUT').length,
        firstIn: groupedTransactions[date].find(t => t.transaction_type === 'IN')?.time,
        lastOut: groupedTransactions[date].findLast(t => t.transaction_type === 'OUT')?.time
      }
    }));

    // Get staff details
    const staffResult = await pool.query(`
      SELECT staffid, firstname, lastname, custom_staff_id 
      FROM staff 
      WHERE staffid = $1
    `, [staffId]);

    const staff = staffResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        staff: staff ? {
          id: staff.staffid,
          name: `${staff.firstname} ${staff.lastname}`,
          employeeNumber: staff.custom_staff_id
        } : null,
        records: attendanceRecords,
        summary: {
          totalDays: attendanceRecords.length,
          totalTransactions: attendanceRecords.reduce((sum, day) => sum + day.summary.totalTransactions, 0),
          totalCheckIns: attendanceRecords.reduce((sum, day) => sum + day.summary.checkIns, 0),
          totalCheckOuts: attendanceRecords.reduce((sum, day) => sum + day.summary.checkOuts, 0)
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
