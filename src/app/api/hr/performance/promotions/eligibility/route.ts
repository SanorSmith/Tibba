import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

// GET - Check promotion eligibility for employee(s)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    if (employeeId) {
      // Check single employee
      const eligibility = await checkEmployeeEligibility(employeeId);
      return NextResponse.json({
        success: true,
        data: eligibility
      });
    } else {
      // Check all employees
      const staffResult = await pool.query('SELECT staffid FROM staff LIMIT 50');
      const eligibilityResults = [];

      for (const row of staffResult.rows) {
        const eligibility = await checkEmployeeEligibility(row.staffid);
        if (eligibility.eligible || eligibility.score >= 65) {
          eligibilityResults.push(eligibility);
        }
      }

      // Sort by score descending
      eligibilityResults.sort((a, b) => b.score - a.score);

      return NextResponse.json({
        success: true,
        data: eligibilityResults,
        count: eligibilityResults.length
      });
    }

  } catch (error: any) {
    console.error('Error checking promotion eligibility:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function checkEmployeeEligibility(employeeId: string) {
  // Get employee info
  const employeeResult = await pool.query(
    `SELECT staffid, firstname, lastname, role, unit, createdat
     FROM staff WHERE staffid = $1`,
    [employeeId]
  );

  if (employeeResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const employee = employeeResult.rows[0];
  const employeeName = `${employee.firstname} ${employee.lastname}`;

  // Calculate years of service
  const createdDate = new Date(employee.createdat);
  const yearsOfService = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  // Get latest performance review
  const reviewResult = await pool.query(
    `SELECT overall_rating, status
     FROM performance_reviews
     WHERE employee_id = $1 AND status = 'FINALIZED'
     ORDER BY review_date DESC LIMIT 1`,
    [employeeId]
  );

  const performanceScore = reviewResult.rows.length > 0 ? 
    parseFloat(reviewResult.rows[0].overall_rating || 0) : 0;

  // Get attendance score
  const attendanceResult = await pool.query(
    `SELECT COUNT(*) as exception_count
     FROM attendance_exceptions
     WHERE employee_id = $1`,
    [employeeId]
  );

  const exceptionCount = parseInt(attendanceResult.rows[0]?.exception_count || 0);
  const attendanceScore = Math.max(0, 100 - (exceptionCount * 5));

  // Get patient feedback
  const feedbackResult = await pool.query(
    `SELECT AVG(overall_satisfaction) as avg_rating, COUNT(*) as count
     FROM patient_feedback
     WHERE employee_id = $1`,
    [employeeId]
  );

  const patientFeedbackScore = parseFloat(feedbackResult.rows[0]?.avg_rating || 0);
  const feedbackCount = parseInt(feedbackResult.rows[0]?.count || 0);

  // Get recognitions
  const recognitionResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM employee_recognitions
     WHERE employee_id = $1 AND status = 'APPROVED'`,
    [employeeId]
  );

  const recognitionCount = parseInt(recognitionResult.rows[0]?.count || 0);

  // Calculate eligibility score (0-100)
  let score = 0;
  const criteria = {
    performance: { score: 0, required: 4.0, weight: 35, met: false },
    attendance: { score: 0, required: 85, weight: 25, met: false },
    yearsOfService: { score: 0, required: 2, weight: 20, met: false },
    patientFeedback: { score: 0, required: 4.0, weight: 10, met: false },
    recognitions: { score: 0, required: 1, weight: 10, met: false }
  };

  // Performance (35 points max)
  if (performanceScore >= 4.5) {
    criteria.performance.score = 35;
    criteria.performance.met = true;
  } else if (performanceScore >= 4.0) {
    criteria.performance.score = 30;
    criteria.performance.met = true;
  } else if (performanceScore >= 3.5) {
    criteria.performance.score = 20;
  } else if (performanceScore >= 3.0) {
    criteria.performance.score = 10;
  }

  // Attendance (25 points max)
  if (attendanceScore >= 95) {
    criteria.attendance.score = 25;
    criteria.attendance.met = true;
  } else if (attendanceScore >= 90) {
    criteria.attendance.score = 22;
    criteria.attendance.met = true;
  } else if (attendanceScore >= 85) {
    criteria.attendance.score = 18;
    criteria.attendance.met = true;
  } else if (attendanceScore >= 80) {
    criteria.attendance.score = 12;
  }

  // Years of Service (20 points max)
  if (yearsOfService >= 5) {
    criteria.yearsOfService.score = 20;
    criteria.yearsOfService.met = true;
  } else if (yearsOfService >= 3) {
    criteria.yearsOfService.score = 18;
    criteria.yearsOfService.met = true;
  } else if (yearsOfService >= 2) {
    criteria.yearsOfService.score = 15;
    criteria.yearsOfService.met = true;
  } else if (yearsOfService >= 1) {
    criteria.yearsOfService.score = 8;
  }

  // Patient Feedback (10 points max)
  if (feedbackCount >= 5) {
    if (patientFeedbackScore >= 4.5) {
      criteria.patientFeedback.score = 10;
      criteria.patientFeedback.met = true;
    } else if (patientFeedbackScore >= 4.0) {
      criteria.patientFeedback.score = 8;
      criteria.patientFeedback.met = true;
    } else if (patientFeedbackScore >= 3.5) {
      criteria.patientFeedback.score = 5;
    }
  }

  // Recognitions (10 points max)
  if (recognitionCount >= 3) {
    criteria.recognitions.score = 10;
    criteria.recognitions.met = true;
  } else if (recognitionCount >= 2) {
    criteria.recognitions.score = 8;
    criteria.recognitions.met = true;
  } else if (recognitionCount >= 1) {
    criteria.recognitions.score = 5;
    criteria.recognitions.met = true;
  }

  score = criteria.performance.score + 
          criteria.attendance.score + 
          criteria.yearsOfService.score + 
          criteria.patientFeedback.score + 
          criteria.recognitions.score;

  // Determine eligibility
  const eligible = score >= 75 && 
                   criteria.performance.met && 
                   criteria.attendance.met && 
                   criteria.yearsOfService.met;

  // Calculate estimated time to eligibility
  let estimatedMonths = 0;
  if (!eligible) {
    if (!criteria.yearsOfService.met) {
      estimatedMonths = Math.max(estimatedMonths, (2 - yearsOfService) * 12);
    }
    if (!criteria.performance.met) {
      estimatedMonths = Math.max(estimatedMonths, 6); // Next review cycle
    }
    if (!criteria.attendance.met) {
      estimatedMonths = Math.max(estimatedMonths, 3); // Improve over 3 months
    }
  }

  return {
    employee_id: employeeId,
    employee_name: employeeName,
    current_position: employee.role,
    current_department: employee.unit,
    eligible,
    score,
    criteria: {
      performance: {
        current: performanceScore,
        required: criteria.performance.required,
        met: criteria.performance.met,
        points: criteria.performance.score,
        maxPoints: criteria.performance.weight
      },
      attendance: {
        current: attendanceScore,
        required: criteria.attendance.required,
        met: criteria.attendance.met,
        points: criteria.attendance.score,
        maxPoints: criteria.attendance.weight
      },
      yearsOfService: {
        current: Math.round(yearsOfService * 10) / 10,
        required: criteria.yearsOfService.required,
        met: criteria.yearsOfService.met,
        points: criteria.yearsOfService.score,
        maxPoints: criteria.yearsOfService.weight
      },
      patientFeedback: {
        current: Math.round(patientFeedbackScore * 10) / 10,
        reviewCount: feedbackCount,
        required: criteria.patientFeedback.required,
        met: criteria.patientFeedback.met,
        points: criteria.patientFeedback.score,
        maxPoints: criteria.patientFeedback.weight
      },
      recognitions: {
        current: recognitionCount,
        required: criteria.recognitions.required,
        met: criteria.recognitions.met,
        points: criteria.recognitions.score,
        maxPoints: criteria.recognitions.weight
      }
    },
    estimatedEligibilityMonths: eligible ? 0 : estimatedMonths,
    recommendations: generateRecommendations(criteria, eligible)
  };
}

function generateRecommendations(criteria: any, eligible: boolean) {
  const recommendations = [];

  if (eligible) {
    recommendations.push('Employee meets all criteria for promotion consideration');
    recommendations.push('Schedule promotion discussion with department head');
    recommendations.push('Prepare promotion proposal with salary recommendation');
  } else {
    if (!criteria.performance.met) {
      recommendations.push(`Improve performance rating to ${criteria.performance.required}+ through training and development`);
    }
    if (!criteria.attendance.met) {
      recommendations.push(`Improve attendance to ${criteria.attendance.required}%+ by reducing exceptions`);
    }
    if (!criteria.yearsOfService.met) {
      recommendations.push(`Continue building experience (${criteria.yearsOfService.required}+ years required)`);
    }
    if (!criteria.patientFeedback.met) {
      recommendations.push('Focus on improving patient satisfaction scores');
    }
    if (!criteria.recognitions.met) {
      recommendations.push('Seek opportunities for recognition through exceptional performance');
    }
  }

  return recommendations;
}
