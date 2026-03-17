import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

// GET - List all performance reviews with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const reviewerId = searchParams.get('reviewer_id');
    const cycleId = searchParams.get('cycle_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        pr.*,
        e.firstname || ' ' || e.lastname as employee_name,
        e.role as employee_role,
        e.unit as employee_department,
        r.firstname || ' ' || r.lastname as reviewer_name
      FROM performance_reviews pr
      LEFT JOIN staff e ON pr.employee_id = e.staffid
      LEFT JOIN staff r ON pr.reviewer_id = r.staffid
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;

    if (employeeId) {
      query += ` AND pr.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (reviewerId) {
      query += ` AND pr.reviewer_id = $${paramCount}`;
      params.push(reviewerId);
      paramCount++;
    }

    if (cycleId) {
      query += ` AND pr.cycle_id = $${paramCount}`;
      params.push(cycleId);
      paramCount++;
    }

    if (status) {
      query += ` AND pr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY pr.review_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM performance_reviews WHERE 1=1';
    const countParams: any[] = [];
    let countParamNum = 1;

    if (employeeId) {
      countQuery += ` AND employee_id = $${countParamNum}`;
      countParams.push(employeeId);
      countParamNum++;
    }
    if (status) {
      countQuery += ` AND status = $${countParamNum}`;
      countParams.push(status);
      countParamNum++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error: any) {
    console.error('Error fetching performance reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new performance review or update existing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      review_id, // For updates
      employee_id,
      reviewer_id,
      cycle_id,
      cycle_name,
      review_period_start,
      review_period_end,
      clinical_competence,
      patient_care,
      professionalism,
      teamwork,
      quality_safety,
      strengths,
      improvements,
      achievements,
      goals_next_period,
      recommendation,
      status = 'NOT_STARTED'
    } = body;

    // Validate required fields
    if (!employee_id || !cycle_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id and cycle_id are required' },
        { status: 400 }
      );
    }

    // Calculate overall rating if competency scores are provided
    let overall_rating = null;
    if (clinical_competence && patient_care && professionalism && teamwork && quality_safety) {
      overall_rating = (
        parseFloat(clinical_competence) +
        parseFloat(patient_care) +
        parseFloat(professionalism) +
        parseFloat(teamwork) +
        parseFloat(quality_safety)
      ) / 5;
      overall_rating = Math.round(overall_rating * 10) / 10; // Round to 1 decimal
    }

    let result;
    
    if (review_id) {
      // Update existing review
      result = await pool.query(
        `UPDATE performance_reviews SET
          reviewer_id = $2,
          cycle_id = $3,
          cycle_name = $4,
          review_period_start = $5,
          review_period_end = $6,
          clinical_competence = $7,
          patient_care = $8,
          professionalism = $9,
          teamwork = $10,
          quality_safety = $11,
          overall_rating = $12,
          strengths = $13,
          improvements = $14,
          achievements = $15,
          goals_next_period = $16,
          recommendation = $17,
          status = $18,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [
          review_id, reviewer_id, cycle_id, cycle_name,
          review_period_start, review_period_end,
          clinical_competence, patient_care, professionalism,
          teamwork, quality_safety, overall_rating,
          strengths, improvements, achievements,
          goals_next_period, recommendation, status
        ]
      );
      
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Performance review updated successfully'
      });
    } else {
      // Create new review
      result = await pool.query(
        `INSERT INTO performance_reviews (
          employee_id, reviewer_id, cycle_id, cycle_name,
          review_period_start, review_period_end,
          clinical_competence, patient_care, professionalism,
          teamwork, quality_safety, overall_rating,
          strengths, improvements, achievements,
          goals_next_period, recommendation, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          employee_id, reviewer_id, cycle_id, cycle_name,
          review_period_start, review_period_end,
          clinical_competence, patient_care, professionalism,
          teamwork, quality_safety, overall_rating,
          strengths, improvements, achievements,
          goals_next_period, recommendation, status
        ]
      );
      
      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Performance review created successfully'
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error creating performance review:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
