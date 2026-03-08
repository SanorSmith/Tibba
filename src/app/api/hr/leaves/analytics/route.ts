import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const department = searchParams.get('department');
    
    // Default to current year if no dates provided
    const now = new Date();
    const defaultStartDate = `${now.getFullYear()}-01-01`;
    const defaultEndDate = `${now.getFullYear()}-12-31`;
    
    const queryStartDate = startDate || defaultStartDate;
    const queryEndDate = endDate || defaultEndDate;
    
    // Get leave statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count,
        SUM(CASE WHEN status = 'APPROVED' THEN working_days_count ELSE 0 END) as total_days_approved,
        AVG(CASE WHEN status = 'APPROVED' THEN working_days_count ELSE NULL END) as avg_days_per_request
      FROM leave_requests
      WHERE start_date >= $1 AND end_date <= $2
      ${department ? 'AND employee_id IN (SELECT staffid FROM staff WHERE unit = $3)' : ''}
    `;
    
    const params = department ? [queryStartDate, queryEndDate, department] : [queryStartDate, queryEndDate];
    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];
    
    // Get leave by type
    const byTypeQuery = `
      SELECT 
        lt.name as leave_type,
        lt.code as leave_type_code,
        COUNT(*) as request_count,
        SUM(lr.working_days_count) as total_days,
        COUNT(CASE WHEN lr.status = 'APPROVED' THEN 1 END) as approved_count
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.start_date >= $1 AND lr.end_date <= $2
      ${department ? 'AND lr.employee_id IN (SELECT staffid FROM staff WHERE unit = $3)' : ''}
      GROUP BY lt.name, lt.code
      ORDER BY total_days DESC
    `;
    
    const byTypeResult = await pool.query(byTypeQuery, params);
    
    // Get leave by department
    const byDeptQuery = `
      SELECT 
        s.unit as department,
        COUNT(*) as request_count,
        SUM(lr.working_days_count) as total_days,
        COUNT(CASE WHEN lr.status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(DISTINCT lr.employee_id) as unique_employees
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.employee_id = s.staffid
      WHERE lr.start_date >= $1 AND lr.end_date <= $2
      GROUP BY s.unit
      ORDER BY total_days DESC
    `;
    
    const byDeptResult = await pool.query(byDeptQuery, [queryStartDate, queryEndDate]);
    
    // Get monthly trend
    const trendQuery = `
      SELECT 
        TO_CHAR(start_date, 'YYYY-MM') as month,
        COUNT(*) as request_count,
        SUM(working_days_count) as total_days,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count
      FROM leave_requests
      WHERE start_date >= $1 AND end_date <= $2
      GROUP BY TO_CHAR(start_date, 'YYYY-MM')
      ORDER BY month
    `;
    
    const trendResult = await pool.query(trendQuery, [queryStartDate, queryEndDate]);
    
    // Get top employees by leave days
    const topEmployeesQuery = `
      SELECT 
        lr.employee_id,
        lr.employee_name,
        s.unit as department,
        COUNT(*) as request_count,
        SUM(lr.working_days_count) as total_days,
        COUNT(CASE WHEN lr.status = 'APPROVED' THEN 1 END) as approved_count
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.employee_id = s.staffid
      WHERE lr.start_date >= $1 AND lr.end_date <= $2
      ${department ? 'AND s.unit = $3' : ''}
      GROUP BY lr.employee_id, lr.employee_name, s.unit
      ORDER BY total_days DESC
      LIMIT 10
    `;
    
    const topEmployeesResult = await pool.query(topEmployeesQuery, params);
    
    // Get approval rate by approver
    const approverStatsQuery = `
      SELECT 
        approved_by_name as approver,
        COUNT(*) as total_reviewed,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
        ROUND(COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as approval_rate
      FROM leave_requests
      WHERE approved_by IS NOT NULL
      AND start_date >= $1 AND end_date <= $2
      GROUP BY approved_by_name
      ORDER BY total_reviewed DESC
      LIMIT 10
    `;
    
    const approverStatsResult = await pool.query(approverStatsQuery, [queryStartDate, queryEndDate]);
    
    // Calculate average processing time
    const processingTimeQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_hours,
        MIN(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as min_hours,
        MAX(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as max_hours
      FROM leave_requests
      WHERE approved_at IS NOT NULL
      AND start_date >= $1 AND end_date <= $2
    `;
    
    const processingTimeResult = await pool.query(processingTimeQuery, [queryStartDate, queryEndDate]);
    
    return NextResponse.json({
      success: true,
      data: {
        period: {
          start_date: queryStartDate,
          end_date: queryEndDate,
          department: department || 'All Departments',
        },
        summary: {
          total_requests: parseInt(stats.total_requests),
          pending: parseInt(stats.pending_count),
          approved: parseInt(stats.approved_count),
          rejected: parseInt(stats.rejected_count),
          cancelled: parseInt(stats.cancelled_count),
          total_days_approved: parseFloat(stats.total_days_approved || 0),
          avg_days_per_request: parseFloat(stats.avg_days_per_request || 0).toFixed(2),
        },
        by_type: byTypeResult.rows.map(row => ({
          leave_type: row.leave_type,
          leave_type_code: row.leave_type_code,
          request_count: parseInt(row.request_count),
          total_days: parseFloat(row.total_days || 0),
          approved_count: parseInt(row.approved_count),
        })),
        by_department: byDeptResult.rows.map(row => ({
          department: row.department,
          request_count: parseInt(row.request_count),
          total_days: parseFloat(row.total_days || 0),
          approved_count: parseInt(row.approved_count),
          unique_employees: parseInt(row.unique_employees),
        })),
        monthly_trend: trendResult.rows.map(row => ({
          month: row.month,
          request_count: parseInt(row.request_count),
          total_days: parseFloat(row.total_days || 0),
          approved_count: parseInt(row.approved_count),
        })),
        top_employees: topEmployeesResult.rows.map(row => ({
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          department: row.department,
          request_count: parseInt(row.request_count),
          total_days: parseFloat(row.total_days || 0),
          approved_count: parseInt(row.approved_count),
        })),
        approver_stats: approverStatsResult.rows.map(row => ({
          approver: row.approver,
          total_reviewed: parseInt(row.total_reviewed),
          approved_count: parseInt(row.approved_count),
          rejected_count: parseInt(row.rejected_count),
          approval_rate: parseFloat(row.approval_rate || 0),
        })),
        processing_time: {
          avg_hours: parseFloat(processingTimeResult.rows[0]?.avg_hours || 0).toFixed(2),
          min_hours: parseFloat(processingTimeResult.rows[0]?.min_hours || 0).toFixed(2),
          max_hours: parseFloat(processingTimeResult.rows[0]?.max_hours || 0).toFixed(2),
        },
      },
    });
    
  } catch (error: any) {
    console.error('Error fetching leave analytics:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch analytics',
    }, { status: 500 });
  }
}
