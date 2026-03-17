import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

// Calculate comprehensive performance score
export async function POST(request: NextRequest) {
  try {
    const { employee_id, review_period } = await request.json();

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    // 1. Get competency ratings from latest performance review
    const reviewResult = await pool.query(
      `SELECT 
        clinical_competence,
        patient_care,
        professionalism,
        teamwork,
        quality_safety,
        overall_rating
      FROM performance_reviews
      WHERE employee_id = $1
      ORDER BY review_date DESC
      LIMIT 1`,
      [employee_id]
    );

    let competencyScore = 0;
    if (reviewResult.rows.length > 0) {
      const review = reviewResult.rows[0];
      competencyScore = review.overall_rating || (
        (review.clinical_competence || 0) +
        (review.patient_care || 0) +
        (review.professionalism || 0) +
        (review.teamwork || 0) +
        (review.quality_safety || 0)
      ) / 5;
    }

    // 2. Get attendance score from attendance_exceptions
    const attendanceResult = await pool.query(
      `SELECT COUNT(*) as total_exceptions
      FROM attendance_exceptions
      WHERE employee_id = $1`,
      [employee_id]
    );

    const totalExceptions = parseInt(attendanceResult.rows[0]?.total_exceptions || 0);
    const attendanceScore = Math.max(0, 100 - (totalExceptions * 5)); // Deduct 5 points per exception

    // 3. Get patient feedback average
    const feedbackResult = await pool.query(
      `SELECT AVG(overall_satisfaction) as avg_rating,
              COUNT(*) as total_feedback
      FROM patient_feedback
      WHERE employee_id = $1`,
      [employee_id]
    );

    const patientFeedbackScore = parseFloat(feedbackResult.rows[0]?.avg_rating || 0);
    const totalFeedback = parseInt(feedbackResult.rows[0]?.total_feedback || 0);

    // 4. Get recognition bonus
    const recognitionResult = await pool.query(
      `SELECT COUNT(*) as total_recognitions
      FROM employee_recognitions
      WHERE employee_id = $1 AND status = 'APPROVED'`,
      [employee_id]
    );

    const totalRecognitions = parseInt(recognitionResult.rows[0]?.total_recognitions || 0);
    const recognitionBonus = Math.min(totalRecognitions * 0.1, 0.5); // Max 0.5 bonus

    // 5. Calculate weighted overall score
    // Competency (40%) + Attendance (30%) + Patient Feedback (20%) + Recognition (10%)
    const overallScore = (
      (competencyScore * 0.40) +
      ((attendanceScore / 20) * 0.30) + // Convert 100-point to 5-point scale
      (patientFeedbackScore * 0.20) +
      (recognitionBonus * 10 * 0.10) // Convert to 5-point scale
    );

    // Determine rating
    let rating = 'NEEDS_IMPROVEMENT';
    if (overallScore >= 4.5) rating = 'OUTSTANDING';
    else if (overallScore >= 4.0) rating = 'EXCEEDS_EXPECTATIONS';
    else if (overallScore >= 3.0) rating = 'MEETS_EXPECTATIONS';
    else if (overallScore >= 2.0) rating = 'BELOW_EXPECTATIONS';

    // Determine impact on overall performance
    let impact = 'NEUTRAL';
    if (overallScore >= 4.0) impact = 'POSITIVE';
    else if (overallScore < 3.0) impact = 'NEGATIVE';

    // Generate recommendations
    const recommendations = [];
    if (competencyScore < 3.0) {
      recommendations.push('Focus on improving clinical competencies through training');
    }
    if (attendanceScore < 85) {
      recommendations.push('Improve attendance and punctuality');
    }
    if (patientFeedbackScore < 4.0 && totalFeedback > 0) {
      recommendations.push('Work on patient communication and satisfaction');
    }
    if (totalRecognitions === 0) {
      recommendations.push('Seek opportunities for recognition through exceptional performance');
    }
    if (overallScore >= 4.0) {
      recommendations.push('Excellent performance - consider for promotion or merit increase');
    }

    return NextResponse.json({
      success: true,
      data: {
        employee_id,
        overall_score: Math.round(overallScore * 100) / 100,
        rating,
        impact,
        breakdown: {
          competency: {
            score: Math.round(competencyScore * 100) / 100,
            weight: '40%',
            contribution: Math.round(competencyScore * 0.40 * 100) / 100
          },
          attendance: {
            score: attendanceScore,
            weight: '30%',
            contribution: Math.round((attendanceScore / 20) * 0.30 * 100) / 100
          },
          patient_feedback: {
            score: Math.round(patientFeedbackScore * 100) / 100,
            total_reviews: totalFeedback,
            weight: '20%',
            contribution: Math.round(patientFeedbackScore * 0.20 * 100) / 100
          },
          recognition: {
            total_awards: totalRecognitions,
            bonus: Math.round(recognitionBonus * 100) / 100,
            weight: '10%',
            contribution: Math.round(recognitionBonus * 10 * 0.10 * 100) / 100
          }
        },
        recommendations
      }
    });

  } catch (error: any) {
    console.error('Error calculating performance score:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
