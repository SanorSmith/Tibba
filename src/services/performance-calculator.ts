import { Pool } from 'pg';

interface AttendanceExceptions {
  total_exceptions: number;
  warnings: number;
  justified: number;
  high_severity: number;
  late_arrivals: number;
  early_departures: number;
  missing_checkout: number;
  unauthorized_absences: number;
}

interface PerformanceScore {
  attendance_score: number;
  attendance_rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  impact_on_overall: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  recommendations: string[];
  trend_analysis: string;
  exceptions_breakdown: AttendanceExceptions;
}

export class PerformanceCalculator {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-a25.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    });
  }

  async getAttendanceExceptions(employeeId: string, startDate: string, endDate: string): Promise<AttendanceExceptions> {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_exceptions,
          SUM(CASE WHEN review_status = 'WARNING_ISSUED' THEN 1 ELSE 0 END) as warnings,
          SUM(CASE WHEN review_status = 'JUSTIFIED' THEN 1 ELSE 0 END) as justified,
          SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
          SUM(CASE WHEN exception_type = 'LATE_ARRIVAL' THEN 1 ELSE 0 END) as late_arrivals,
          SUM(CASE WHEN exception_type = 'EARLY_DEPARTURE' THEN 1 ELSE 0 END) as early_departures,
          SUM(CASE WHEN exception_type = 'MISSING_CHECKOUT' THEN 1 ELSE 0 END) as missing_checkout,
          SUM(CASE WHEN exception_type = 'UNAUTHORIZED_ABSENCE' THEN 1 ELSE 0 END) as unauthorized_absences
        FROM attendance_exceptions 
        WHERE employee_id = $1 
          AND exception_date BETWEEN $2 AND $3
      `, [employeeId, startDate, endDate]);
      
      const row = result.rows[0];
      
      if (!row) {
        // No data found for this employee
        return {
          total_exceptions: 0,
          warnings: 0,
          justified: 0,
          high_severity: 0,
          late_arrivals: 0,
          early_departures: 0,
          missing_checkout: 0,
          unauthorized_absences: 0
        };
      }
      
      return {
        total_exceptions: parseInt(row.total_exceptions) || 0,
        warnings: parseInt(row.warnings) || 0,
        justified: parseInt(row.justified) || 0,
        high_severity: parseInt(row.high_severity) || 0,
        late_arrivals: parseInt(row.late_arrivals) || 0,
        early_departures: parseInt(row.early_departures) || 0,
        missing_checkout: parseInt(row.missing_checkout) || 0,
        unauthorized_absences: parseInt(row.unauthorized_absences) || 0
      };
    } catch (error) {
      console.error('Error fetching attendance exceptions:', error);
      // Return default values instead of throwing error
      return {
        total_exceptions: 0,
        warnings: 0,
        justified: 0,
        high_severity: 0,
        late_arrivals: 0,
        early_departures: 0,
        missing_checkout: 0,
        unauthorized_absences: 0
      };
    }
  }

  async calculateAttendanceScore(employeeId: string, reviewPeriod: { start_date: string; end_date: string }): Promise<PerformanceScore> {
    try {
      const exceptions = await this.getAttendanceExceptions(employeeId, reviewPeriod.start_date, reviewPeriod.end_date);
      
      let score = 100;
      
      score -= (exceptions.warnings * 10);
      score -= (exceptions.high_severity * 8);
      
      if (exceptions.late_arrivals > 5) score -= 15;
      if (exceptions.early_departures > 3) score -= 10;
      if (exceptions.missing_checkout > 2) score -= 12;
      if (exceptions.unauthorized_absences > 0) score -= 20;
      
      if (exceptions.total_exceptions === 0) score += 5;
      else if (exceptions.warnings === 0) score += 2;
      
      score = Math.max(0, Math.min(100, score));
      
      let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      if (score >= 90) rating = 'EXCELLENT';
      else if (score >= 75) rating = 'GOOD';
      else if (score >= 60) rating = 'FAIR';
      else rating = 'POOR';
      
      let impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      if (score >= 85) impact = 'POSITIVE';
      else if (score >= 70) impact = 'NEUTRAL';
      else impact = 'NEGATIVE';
      
      const recommendations = this.generateRecommendations(exceptions, score);
      const trendAnalysis = await this.analyzeTrends(employeeId, reviewPeriod);
      
      return {
        attendance_score: score,
        attendance_rating: rating,
        impact_on_overall: impact,
        recommendations,
        trend_analysis: trendAnalysis,
        exceptions_breakdown: exceptions
      };
    } catch (error) {
      console.error('Error calculating attendance score:', error);
      throw error;
    }
  }

  private generateRecommendations(exceptions: AttendanceExceptions, score: number): string[] {
    const recommendations: string[] = [];
    
    if (exceptions.warnings >= 3) {
      recommendations.push('Attendance improvement plan required');
      recommendations.push('Regular check-ins with manager recommended');
    }
    
    if (exceptions.high_severity > 0) {
      recommendations.push('Address severe attendance violations immediately');
    }
    
    if (exceptions.late_arrivals > 5) {
      recommendations.push('Time management coaching recommended');
      recommendations.push('Review schedule and transportation options');
    }
    
    if (exceptions.early_departures > 3) {
      recommendations.push('Address early departure pattern');
    }
    
    if (exceptions.missing_checkout > 2) {
      recommendations.push('Ensure proper checkout procedures are followed');
    }
    
    if (exceptions.unauthorized_absences > 0) {
      recommendations.push('Unauthorized absences require immediate attention');
    }
    
    if (score >= 85) {
      recommendations.push('Excellent attendance record - consider for recognition');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Good attendance record - maintain current performance');
    }
    
    return recommendations;
  }

  private async analyzeTrends(employeeId: string, reviewPeriod: { start_date: string; end_date: string }): Promise<string> {
    try {
      const result = await this.pool.query(`
        WITH monthly_data AS (
          SELECT 
            DATE_TRUNC('month', exception_date) as month,
            COUNT(*) as exceptions_count,
            SUM(CASE WHEN review_status = 'WARNING_ISSUED' THEN 1 ELSE 0 END) as warnings
          FROM attendance_exceptions 
          WHERE employee_id = $1 
            AND exception_date BETWEEN $2 AND $3
          GROUP BY DATE_TRUNC('month', exception_date)
          ORDER BY month
        )
        SELECT 
          COUNT(*) as month_count,
          AVG(exceptions_count) as avg_monthly,
          STDDEV(exceptions_count) as volatility
        FROM monthly_data
      `, [employeeId, reviewPeriod.start_date, reviewPeriod.end_date]);
      
      const trend = result.rows[0];
      
      if (!trend || trend.month_count === 0) {
        return 'No attendance data available for trend analysis';
      }
      
      if (trend.avg_monthly === 0) {
        return 'Perfect attendance record';
      }
      
      if (trend.volatility > 2) {
        return 'Attendance is inconsistent - needs attention';
      }
      
      return 'Attendance pattern is stable';
    } catch (error) {
      console.error('Error analyzing trends:', error);
      return 'Unable to analyze trends';
    }
  }

  async close() {
    await this.pool.end();
  }
}
