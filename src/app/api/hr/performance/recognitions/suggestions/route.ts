import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

// GET - Auto-suggest employees for recognition
export async function GET(request: NextRequest) {
  try {
    const suggestions = [];

    // 1. Perfect Attendance (95%+ attendance, no exceptions in last 3 months)
    const perfectAttendanceResult = await pool.query(`
      SELECT 
        s.staffid as employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.role,
        COUNT(ae.id) as exception_count
      FROM staff s
      LEFT JOIN attendance_exceptions ae ON s.staffid = ae.employee_id 
        AND ae.exception_date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY s.staffid, s.firstname, s.lastname, s.role
      HAVING COUNT(ae.id) = 0
      LIMIT 10
    `);

    for (const row of perfectAttendanceResult.rows) {
      suggestions.push({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_role: row.role,
        type: 'PERFECT_ATTENDANCE',
        title: 'Perfect Attendance Award - Q1 2026',
        reason: `${row.employee_name} has maintained perfect attendance with zero exceptions for the past 3 months.`,
        suggested_reward: 300,
        priority: 'HIGH'
      });
    }

    // 2. Excellence Award (Performance >= 4.5)
    const excellenceResult = await pool.query(`
      SELECT 
        s.staffid as employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.role,
        pr.overall_rating
      FROM staff s
      INNER JOIN performance_reviews pr ON s.staffid = pr.employee_id
      WHERE pr.overall_rating >= 4.5
        AND pr.status = 'FINALIZED'
        AND NOT EXISTS (
          SELECT 1 FROM employee_recognitions er
          WHERE er.employee_id = s.staffid
            AND er.type = 'EXCELLENCE_AWARD'
            AND er.recognition_date >= CURRENT_DATE - INTERVAL '6 months'
        )
      ORDER BY pr.overall_rating DESC
      LIMIT 5
    `);

    for (const row of excellenceResult.rows) {
      suggestions.push({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_role: row.role,
        type: 'EXCELLENCE_AWARD',
        title: 'Excellence in Performance Award',
        reason: `Outstanding performance rating of ${row.overall_rating}/5.0 demonstrates exceptional dedication and skill.`,
        suggested_reward: 500,
        priority: 'HIGH'
      });
    }

    // 3. Patient Satisfaction (Average feedback >= 4.5 with at least 5 reviews)
    const patientSatisfactionResult = await pool.query(`
      SELECT 
        s.staffid as employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.role,
        AVG(pf.overall_satisfaction) as avg_rating,
        COUNT(pf.id) as feedback_count
      FROM staff s
      INNER JOIN patient_feedback pf ON s.staffid = pf.employee_id
      WHERE pf.feedback_date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY s.staffid, s.firstname, s.lastname, s.role
      HAVING AVG(pf.overall_satisfaction) >= 4.5 AND COUNT(pf.id) >= 5
      ORDER BY AVG(pf.overall_satisfaction) DESC
      LIMIT 5
    `);

    for (const row of patientSatisfactionResult.rows) {
      suggestions.push({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_role: row.role,
        type: 'CUSTOMER_SERVICE',
        title: 'Patient Satisfaction Excellence',
        reason: `Achieved ${row.avg_rating.toFixed(1)}/5.0 patient satisfaction rating across ${row.feedback_count} reviews.`,
        suggested_reward: 400,
        priority: 'MEDIUM'
      });
    }

    // 4. Spot Award (Recent exceptional performance)
    const spotAwardResult = await pool.query(`
      SELECT 
        s.staffid as employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.role,
        pr.overall_rating,
        pr.strengths
      FROM staff s
      INNER JOIN performance_reviews pr ON s.staffid = pr.employee_id
      WHERE pr.overall_rating >= 4.0
        AND pr.status = 'FINALIZED'
        AND pr.review_date >= CURRENT_DATE - INTERVAL '1 month'
        AND NOT EXISTS (
          SELECT 1 FROM employee_recognitions er
          WHERE er.employee_id = s.staffid
            AND er.recognition_date >= CURRENT_DATE - INTERVAL '3 months'
        )
      ORDER BY pr.overall_rating DESC
      LIMIT 10
    `);

    for (const row of spotAwardResult.rows) {
      suggestions.push({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_role: row.role,
        type: 'SPOT_AWARD',
        title: 'Spot Award for Excellence',
        reason: `Recent performance review shows strong results (${row.overall_rating}/5.0). ${row.strengths || 'Consistent high-quality work.'}`,
        suggested_reward: 250,
        priority: 'MEDIUM'
      });
    }

    return NextResponse.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
      message: `Found ${suggestions.length} recognition suggestions`
    });

  } catch (error: any) {
    console.error('Error generating recognition suggestions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
