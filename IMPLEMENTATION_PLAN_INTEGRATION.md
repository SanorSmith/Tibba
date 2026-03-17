# Complete Implementation Plan - Attendance Exceptions Integration

## 🎯 Overview
Integrate attendance exceptions data with payroll and performance modules to create a fully connected HR system.

---

## 🛠️ Backend Implementation

### **1. Payroll Module Integration**

#### **A. Update Payroll Calculator Service**
**File:** `src/services/payroll-calculator.ts`

```typescript
// ADD: Attendance exceptions interface
interface AttendanceExceptions {
  total_exceptions: number;
  warnings: number;
  justified: number;
  high_severity: number;
  unauthorized_absences: number;
  late_arrivals: number;
  early_departures: number;
}

// ADD: Enhanced payroll calculation
export class PayrollCalculator {
  /**
   * Get attendance exceptions for payroll period
   */
  async getAttendanceExceptions(employeeId: string, startDate: string, endDate: string): Promise<AttendanceExceptions> {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_exceptions,
        SUM(CASE WHEN review_status = 'WARNING_ISSUED' THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN review_status = 'JUSTIFIED' THEN 1 ELSE 0 END) as justified,
        SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
        SUM(CASE WHEN exception_type = 'UNAUTHORIZED_ABSENCE' THEN 1 ELSE 0 END) as unauthorized_absences,
        SUM(CASE WHEN exception_type = 'LATE_ARRIVAL' THEN 1 ELSE 0 END) as late_arrivals,
        SUM(CASE WHEN exception_type = 'EARLY_DEPARTURE' THEN 1 ELSE 0 END) as early_departures
      FROM attendance_exceptions 
      WHERE employee_id = $1 
        AND exception_date BETWEEN $2 AND $3
    `, [employeeId, startDate, endDate]);
    
    return result.rows[0];
  }

  /**
   * Calculate attendance bonus percentage
   */
  async calculateAttendanceBonus(exceptions: AttendanceExceptions): Promise<number> {
    let bonusPercentage = 100;
    
    // Deduct for warnings
    if (exceptions.warnings > 0) {
      bonusPercentage -= (exceptions.warnings * 25);
    }
    
    // No bonus for unauthorized absences
    if (exceptions.unauthorized_absences > 0) {
      bonusPercentage = 0;
    }
    
    // Additional deduction for high severity
    if (exceptions.high_severity > 0) {
      bonusPercentage -= (exceptions.high_severity * 10);
    }
    
    // Bonus reduction for multiple late arrivals
    if (exceptions.late_arrivals > 5) {
      bonusPercentage -= 15;
    }
    
    return Math.max(0, bonusPercentage);
  }

  /**
   * Enhanced gross salary calculation with attendance impact
   */
  async calculateGrossSalary(
    employee: Employee, 
    attendance: AttendanceData,
    payrollPeriod: { start_date: string; end_date: string }
  ): Promise<GrossSalaryBreakdown> {
    // Get attendance exceptions
    const exceptions = await this.getAttendanceExceptions(
      employee.id, 
      payrollPeriod.start_date, 
      payrollPeriod.end_date
    );
    
    // Current base calculation (existing code)
    let baseSalary = employee.base_salary;
    
    // Pro-rata calculation for new employees
    if (employee.hire_date) {
      const hireDate = new Date(employee.hire_date);
      const today = new Date();
      const daysInMonth = 30;
      const daysWorked = Math.min(attendance.days_worked, daysInMonth);
      
      if (hireDate > new Date(today.getFullYear(), today.getMonth(), 1)) {
        baseSalary = (baseSalary / daysInMonth) * daysWorked;
      }
    }

    // Deduct unpaid leave
    if (attendance.unpaid_leave_days && attendance.unpaid_leave_days > 0) {
      const dailyRate = baseSalary / 30;
      const unpaidDeduction = dailyRate * attendance.unpaid_leave_days;
      baseSalary = baseSalary - unpaidDeduction;
    }

    // Calculate attendance bonus
    const attendanceBonusPercentage = await this.calculateAttendanceBonus(exceptions);
    const baseAttendanceBonus = baseSalary * 0.1; // 10% base bonus
    const attendanceBonus = baseAttendanceBonus * (attendanceBonusPercentage / 100);

    // Calculate other components (existing code)
    const allowances = Object.values(employee.allowances || {}).reduce((sum, amount) => sum + amount, 0);
    const hourlyRate = baseSalary / attendance.days_worked / 8;
    const overtimeRate = hourlyRate * 1.5;
    const overtimePay = attendance.overtime_hours * overtimeRate;
    const nightShiftHourlyRate = hourlyRate * 0.30;
    const nightShiftDifferential = attendance.night_shifts * 8 * nightShiftHourlyRate;
    const hazardPay = attendance.hazard_shifts * 50;

    // Calculate gross salary with attendance bonus
    const grossSalary = baseSalary + allowances + overtimePay + nightShiftDifferential + hazardPay + attendanceBonus;

    return {
      base_salary: Math.round(baseSalary * 100) / 100,
      allowances: Math.round(allowances * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      night_shift_differential: Math.round(nightShiftDifferential * 100) / 100,
      hazard_pay: Math.round(hazardPay * 100) / 100,
      attendance_bonus: Math.round(attendanceBonus * 100) / 100,
      attendance_bonus_percentage: attendanceBonusPercentage,
      gross_salary: Math.round(grossSalary * 100) / 100,
      attendance_impact: {
        exceptions: exceptions,
        bonus_reduction: 100 - attendanceBonusPercentage,
        recommendation: this.generatePayrollRecommendation(exceptions)
      }
    };
  }

  /**
   * Generate payroll recommendations based on attendance
   */
  private generatePayrollRecommendation(exceptions: AttendanceExceptions): string {
    if (exceptions.unauthorized_absences > 0) {
      return 'No attendance bonus due to unauthorized absences';
    }
    if (exceptions.warnings >= 3) {
      return 'Attendance improvement plan recommended';
    }
    if (exceptions.warnings >= 1) {
      return 'Partial attendance bonus due to warnings';
    }
    return 'Full attendance bonus eligible';
  }
}
```

#### **B. Create Payroll API Endpoint**
**File:** `src/app/api/hr/payroll/calculate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PayrollCalculator } from '@/services/payroll-calculator';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, payroll_period, attendance_data } = await request.json();
    
    // Get employee data
    const employeeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/employees/${employee_id}`);
    const employee = await employeeResponse.json();
    
    // Calculate payroll with attendance integration
    const calculator = new PayrollCalculator();
    const result = await calculator.calculateGrossSalary(
      employee.data,
      attendance_data,
      payroll_period
    );
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

### **2. Performance Module Integration**

#### **A. Create Performance Service**
**File:** `src/services/performance-calculator.ts`

```typescript
import { Pool } from 'pg';

interface AttendanceExceptions {
  total_exceptions: number;
  warnings: number;
  justified: number;
  high_severity: number;
  late_arrivals: number;
  early_departures: number;
  missing_checkout: number;
}

interface PerformanceScore {
  attendance_score: number;
  attendance_rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  impact_on_overall: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  recommendations: string[];
  trend_analysis: string;
}

export class PerformanceCalculator {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL });

  /**
   * Get attendance exceptions for performance period
   */
  async getAttendanceExceptions(employeeId: string, startDate: string, endDate: string): Promise<AttendanceExceptions> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_exceptions,
        SUM(CASE WHEN review_status = 'WARNING_ISSUED' THEN 1 ELSE 0 END) as warnings,
        SUM(CASE WHEN review_status = 'JUSTIFIED' THEN 1 ELSE 0 END) as justified,
        SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
        SUM(CASE WHEN exception_type = 'LATE_ARRIVAL' THEN 1 ELSE 0 END) as late_arrivals,
        SUM(CASE WHEN exception_type = 'EARLY_DEPARTURE' THEN 1 ELSE 0 END) as early_departures,
        SUM(CASE WHEN exception_type = 'MISSING_CHECKOUT' THEN 1 ELSE 0 END) as missing_checkout
      FROM attendance_exceptions 
      WHERE employee_id = $1 
        AND exception_date BETWEEN $2 AND $3
    `, [employeeId, startDate, endDate]);
    
    return result.rows[0];
  }

  /**
   * Calculate attendance performance score
   */
  async calculateAttendanceScore(employeeId: string, reviewPeriod: { start_date: string; end_date: string }): Promise<PerformanceScore> {
    const exceptions = await this.getAttendanceExceptions(employeeId, reviewPeriod.start_date, reviewPeriod.end_date);
    
    // Calculate base score (0-100)
    let score = 100;
    
    // Deduct points for warnings
    score -= (exceptions.warnings * 10);
    
    // Deduct points for high severity
    score -= (exceptions.high_severity * 8);
    
    // Deduct points for patterns
    if (exceptions.late_arrivals > 5) score -= 15;
    if (exceptions.early_departures > 3) score -= 10;
    if (exceptions.missing_checkout > 2) score -= 12;
    
    // Bonus for clean record
    if (exceptions.total_exceptions === 0) score += 5;
    else if (exceptions.warnings === 0) score += 2;
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));
    
    // Determine rating
    let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (score >= 90) rating = 'EXCELLENT';
    else if (score >= 75) rating = 'GOOD';
    else if (score >= 60) rating = 'FAIR';
    else rating = 'POOR';
    
    // Determine impact on overall performance
    let impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    if (score >= 85) impact = 'POSITIVE';
    else if (score >= 70) impact = 'NEUTRAL';
    else impact = 'NEGATIVE';
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(exceptions, score);
    
    // Analyze trends
    const trendAnalysis = await this.analyzeTrends(employeeId, reviewPeriod);
    
    return {
      attendance_score: score,
      attendance_rating: rating,
      impact_on_overall: impact,
      recommendations,
      trend_analysis: trendAnalysis
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(exceptions: AttendanceExceptions, score: number): string[] {
    const recommendations: string[] = [];
    
    if (exceptions.warnings >= 3) {
      recommendations.push('Attendance improvement plan required');
      recommendations.push('Regular check-ins with manager recommended');
    }
    
    if (exceptions.high_severity > 0) {
      recommendations.push('Address severe attendance violations immediately');
      recommendations.push('Consider disciplinary action for repeated issues');
    }
    
    if (exceptions.late_arrivals > 5) {
      recommendations.push('Time management coaching recommended');
      recommendations.push('Review schedule and transportation options');
    }
    
    if (exceptions.early_departures > 3) {
      recommendations.push('Address early departure pattern');
      recommendations.push('Review workload and scheduling');
    }
    
    if (exceptions.missing_checkout > 2) {
      recommendations.push('Ensure proper checkout procedures are followed');
      recommendations.push('System training may be required');
    }
    
    if (score >= 85) {
      recommendations.push('Excellent attendance record - consider for recognition');
    }
    
    return recommendations;
  }

  /**
   * Analyze attendance trends
   */
  private async analyzeTrends(employeeId: string, reviewPeriod: { start_date: string; end_date: string }): Promise<string> {
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
        AVG(exceptions_count) as avg_monthly,
        STDDEV(exceptions_count) as volatility,
        CASE 
          WHEN MAX(warnings) > MIN(warnings) THEN 'IMPROVING'
          WHEN MAX(warnings) < MIN(warnings) THEN 'DECLINING'
          ELSE 'STABLE'
        END as trend
      FROM monthly_data
    `, [employeeId, reviewPeriod.start_date, reviewPeriod.end_date]);
    
    const trend = result.rows[0];
    
    if (trend.trend === 'IMPROVING') return 'Attendance pattern is improving';
    if (trend.trend === 'DECLINING') return 'Attendance pattern is declining - intervention needed';
    if (trend.volatility > 2) return 'Attendance is inconsistent - needs attention';
    return 'Attendance pattern is stable';
  }
}
```

#### **B. Create Performance API Endpoint**
**File:** `src/app/api/hr/performance/attendance-score/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PerformanceCalculator } from '@/services/performance-calculator';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, review_period } = await request.json();
    
    const calculator = new PerformanceCalculator();
    const score = await calculator.calculateAttendanceScore(employee_id, review_period);
    
    return NextResponse.json({
      success: true,
      data: score
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🎨 Frontend Implementation

### **1. Payroll UI Updates**

#### **A. Enhanced Payroll Dashboard**
**File:** `src/app/(dashboard)/hr/payroll/page.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PayrollDashboard() {
  const [payrollData, setPayrollData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  useEffect(() => {
    fetchPayrollData();
  }, [selectedPeriod]);

  const fetchPayrollData = async () => {
    const response = await fetch(`/api/hr/payroll/summary?period=${selectedPeriod}`);
    const data = await response.json();
    setPayrollData(data.data);
  };

  return (
    <div className="payroll-dashboard">
      <h1>Payroll Management</h1>
      
      {/* Attendance Impact Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Impact on Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="metric">
              <span className="label">Total Exceptions:</span>
              <span className="value">{payrollData?.attendance_summary?.total_exceptions}</span>
            </div>
            <div className="metric">
              <span className="label">Warnings:</span>
              <span className="value negative">{payrollData?.attendance_summary?.total_warnings}</span>
            </div>
            <div className="metric">
              <span className="label">Bonus Reduction:</span>
              <span className="value negative">{payrollData?.attendance_summary?.bonus_reduction}%</span>
            </div>
            <div className="metric">
              <span className="label">Impact Amount:</span>
              <span className="value negative">-${payrollData?.attendance_summary?.financial_impact}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Payroll List with Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Payroll Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="payroll-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Base Salary</th>
                  <th>Attendance Bonus</th>
                  <th>Attendance Score</th>
                  <th>Warnings</th>
                  <th>Gross Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollData?.employees?.map(employee => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>${employee.base_salary}</td>
                    <td className={employee.attendance_bonus_percentage === 100 ? 'positive' : 'negative'}>
                      ${employee.attendance_bonus} ({employee.attendance_bonus_percentage}%)
                    </td>
                    <td>
                      <div className="attendance-score">
                        <div className="score-bar">
                          <div 
                            className="score-fill" 
                            style={{ width: `${employee.attendance_score}%` }}
                          />
                        </div>
                        <span>{employee.attendance_score}/100</span>
                      </div>
                    </td>
                    <td className={employee.attendance_warnings > 0 ? 'negative' : 'positive'}>
                      {employee.attendance_warnings}
                    </td>
                    <td>${employee.gross_salary}</td>
                    <td>
                      <button 
                        onClick={() => viewAttendanceDetails(employee.id)}
                        className="btn-secondary"
                      >
                        View Attendance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const viewAttendanceDetails = (employeeId: string) => {
    // Navigate to attendance details or open modal
    window.open(`/hr/attendance/exceptions?employee=${employeeId}`, '_blank');
  };
}
```

#### **B. Attendance Impact Modal**
**File:** `src/components/payroll/attendance-impact-modal.tsx`

```typescript
interface AttendanceImpactModalProps {
  employee: any;
  onClose: () => void;
}

export default function AttendanceImpactModal({ employee, onClose }: AttendanceImpactModalProps) {
  const [attendanceDetails, setAttendanceDetails] = useState(null);

  useEffect(() => {
    fetchAttendanceDetails();
  }, [employee.id]);

  const fetchAttendanceDetails = async () => {
    const response = await fetch(`/api/hr/attendance/employee/${employee.id}/summary`);
    const data = await response.json();
    setAttendanceDetails(data.data);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Attendance Impact - {employee.name}</h2>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Attendance Score */}
          <div className="impact-section">
            <h3>Attendance Score: {attendanceDetails?.score}/100</h3>
            <div className="score-breakdown">
              <div className="score-item">
                <span>Base Score:</span>
                <span>100</span>
              </div>
              <div className="score-item negative">
                <span>Warning Deductions:</span>
                <span>-{attendanceDetails?.warnings * 10}</span>
              </div>
              <div className="score-item negative">
                <span>Severity Deductions:</span>
                <span>-{attendanceDetails?.high_severity * 8}</span>
              </div>
              <div className="score-item positive">
                <span>Clean Record Bonus:</span>
                <span>+{attendanceDetails?.total_exceptions === 0 ? 5 : 0}</span>
              </div>
            </div>
          </div>

          {/* Payroll Impact */}
          <div className="impact-section">
            <h3>Payroll Impact</h3>
            <div className="payroll-breakdown">
              <div className="payroll-item">
                <span>Base Attendance Bonus:</span>
                <span>${attendanceDetails?.base_bonus}</span>
              </div>
              <div className="payroll-item negative">
                <span>Warning Reduction:</span>
                <span>-${attendanceDetails?.warning_reduction}</span>
              </div>
              <div className="payroll-item positive">
                <span>Final Bonus:</span>
                <span>${attendanceDetails?.final_bonus}</span>
              </div>
            </div>
          </div>

          {/* Exception Breakdown */}
          <div className="impact-section">
            <h3>Exception Breakdown</h3>
            <div className="exception-list">
              {attendanceDetails?.exceptions?.map((exception: any) => (
                <div key={exception.id} className="exception-item">
                  <span className="exception-type">{exception.exception_type}</span>
                  <span className="exception-date">{exception.exception_date}</span>
                  <span className={`exception-status ${exception.review_status.toLowerCase()}`}>
                    {exception.review_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### **2. Performance UI Updates**

#### **A. Enhanced Performance Review Page**
**File:** `src/app/(dashboard)/hr/performance/reviews/[id]/page.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PerformanceReviewPage({ params }: { params: { id: string } }) {
  const [reviewData, setReviewData] = useState(null);
  const [attendanceScore, setAttendanceScore] = useState(null);

  useEffect(() => {
    fetchReviewData();
    fetchAttendanceScore();
  }, [params.id]);

  const fetchReviewData = async () => {
    const response = await fetch(`/api/hr/performance/reviews/${params.id}`);
    const data = await response.json();
    setReviewData(data.data);
  };

  const fetchAttendanceScore = async () => {
    const response = await fetch(`/api/hr/performance/attendance-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: reviewData?.employee_id,
        review_period: {
          start_date: reviewData?.cycle_start_date,
          end_date: reviewData?.cycle_end_date
        }
      })
    });
    const data = await response.json();
    setAttendanceScore(data.data);
  };

  return (
    <div className="performance-review">
      <h1>Performance Review - {reviewData?.employee_name}</h1>
      
      {/* Attendance Impact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="attendance-overview">
            <div className="score-display">
              <div className="score-circle">
                <div 
                  className="score-fill" 
                  style={{ 
                    background: attendanceScore?.attendance_score >= 85 ? '#10B981' : 
                              attendanceScore?.attendance_score >= 70 ? '#F59E0B' : '#EF4444'
                  }}
                >
                  {attendanceScore?.attendance_score}
                </div>
              </div>
              <div className="score-details">
                <h3>Attendance Score: {attendanceScore?.attendance_score}/100</h3>
                <p>Rating: {attendanceScore?.attendance_rating}</p>
                <p>Impact: {attendanceScore?.impact_on_overall}</p>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="recommendations">
              <h4>Attendance Recommendations:</h4>
              <ul>
                {attendanceScore?.recommendations?.map((rec: string, index: number) => (
                  <li key={index} className="recommendation-item">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Performance with Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overall-rating">
            <div className="rating-breakdown">
              <div className="rating-item">
                <span>Clinical Skills:</span>
                <span>{reviewData?.clinical_competence}/5.0</span>
              </div>
              <div className="rating-item">
                <span>Professionalism:</span>
                <span>{reviewData?.professionalism}/5.0</span>
              </div>
              <div className="rating-item">
                <span>Attendance:</span>
                <span>{(attendanceScore?.attendance_score / 20).toFixed(1)}/5.0</span>
              </div>
              <div className="rating-item highlighted">
                <span>Overall Rating:</span>
                <span>{reviewData?.overall_rating}/5.0</span>
              </div>
            </div>
            
            {/* Attendance Trend */}
            <div className="trend-analysis">
              <h4>Attendance Trend:</h4>
              <p>{attendanceScore?.trend_analysis}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### **B. Attendance Score Component**
**File:** `src/components/performance/attendance-score.tsx`

```typescript
interface AttendanceScoreProps {
  employeeId: string;
  reviewPeriod: { start_date: string; end_date: string };
}

export default function AttendanceScore({ employeeId, reviewPeriod }: AttendanceScoreProps) {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScore();
  }, [employeeId, reviewPeriod]);

  const fetchScore = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hr/performance/attendance-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, review_period: reviewPeriod })
      });
      const data = await response.json();
      setScore(data.data);
    } catch (error) {
      console.error('Error fetching attendance score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading attendance score...</div>;

  return (
    <div className="attendance-score">
      <div className="score-header">
        <h3>Attendance Performance</h3>
        <div className={`score-badge ${score?.attendance_rating.toLowerCase()}`}>
          {score?.attendance_score}/100
        </div>
      </div>
      
      <div className="score-visual">
        <div className="score-bar">
          <div 
            className="score-fill" 
            style={{ 
              width: `${score?.attendance_score}%`,
              backgroundColor: score?.attendance_score >= 85 ? '#10B981' : 
                               score?.attendance_score >= 70 ? '#F59E0B' : '#EF4444'
            }}
          />
        </div>
        <span className="score-label">{score?.attendance_rating}</span>
      </div>
      
      <div className="score-impact">
        <p><strong>Impact:</strong> {score?.impact_on_overall}</p>
        <p><strong>Trend:</strong> {score?.trend_analysis}</p>
      </div>
      
      {score?.recommendations?.length > 0 && (
        <div className="recommendations">
          <h4>Recommendations:</h4>
          <ul>
            {score.recommendations.map((rec: string, index: number) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 📋 Implementation Steps

### **Phase 1: Backend Development (Week 1-2)**
1. **Update Payroll Calculator**
   - Add attendance exceptions interface
   - Implement attendance bonus calculation
   - Add attendance impact recommendations

2. **Create Performance Calculator**
   - Implement attendance score calculation
   - Add trend analysis
   - Generate recommendations

3. **Create API Endpoints**
   - `/api/hr/payroll/calculate` - Enhanced payroll calculation
   - `/api/hr/performance/attendance-score` - Performance scoring

### **Phase 2: Frontend Development (Week 2-3)**
1. **Update Payroll Dashboard**
   - Add attendance impact summary
   - Show attendance bonuses/reductions
   - Add attendance score visualization

2. **Enhance Performance Reviews**
   - Add attendance score component
   - Show attendance recommendations
   - Include attendance in overall rating

3. **Create Modals and Components**
   - Attendance impact modal
   - Attendance score component
   - Recommendation display

### **Phase 3: Integration & Testing (Week 3-4)**
1. **Database Testing**
   - Test queries with real data
   - Verify calculations
   - Performance optimization

2. **UI Testing**
   - Test payroll calculations
   - Test performance scores
   - Verify user experience

3. **End-to-End Testing**
   - Complete workflow testing
   - Cross-module integration
   - User acceptance testing

---

## 🎯 Expected Outcomes

### **Payroll Module:**
- ✅ Attendance bonuses calculated automatically
- ✅ Warning-based payroll reductions
- ✅ Clear attendance impact visualization
- ✅ Attendance-based recommendations

### **Performance Module:**
- ✅ Automated attendance scoring
- ✅ Attendance impact on overall rating
- ✅ Trend analysis and recommendations
- ✅ Data-driven performance reviews

### **System Benefits:**
- ✅ Fully integrated HR ecosystem
- ✅ Data-driven decision making
- ✅ Automated calculations and scoring
- ✅ Consistent application of policies
- ✅ Improved employee experience

This implementation will transform your isolated attendance exceptions system into a fully integrated HR management platform!
