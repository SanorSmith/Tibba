'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

interface AttendanceImpactProps {
  employeeId: string;
  payrollPeriod: { start_date: string; end_date: string };
}

interface AttendanceImpactData {
  exceptions: {
    total_exceptions: number;
    warnings: number;
    justified: number;
    high_severity: number;
    unauthorized_absences: number;
    late_arrivals: number;
  };
  bonus_percentage: number;
  recommendation: string;
}

export default function AttendanceImpactCard({ employeeId, payrollPeriod }: AttendanceImpactProps) {
  const [impact, setImpact] = useState<AttendanceImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImpact();
  }, [employeeId, payrollPeriod]);

  const fetchImpact = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/hr/payroll/calculate-enhanced?employee_id=${employeeId}&start_date=${payrollPeriod.start_date}&end_date=${payrollPeriod.end_date}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setImpact(data.data);
      } else {
        setError(data.error || 'Failed to fetch attendance impact');
      }
    } catch (err: any) {
      console.error('Error fetching attendance impact:', err);
      setError(err.message || 'Failed to fetch attendance impact');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Impact on Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading attendance impact...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Impact on Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-red-600">
            <AlertTriangle className="mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!impact) return null;

  const bonusReduction = 100 - impact.bonus_percentage;
  const hasNegativeImpact = bonusReduction > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          Attendance Impact on Payroll
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Bonus Percentage Display */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 mb-1">Attendance Bonus Eligibility</div>
              <div className="flex items-center space-x-2">
                {hasNegativeImpact ? (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                )}
                <span className={`text-3xl font-bold ${hasNegativeImpact ? 'text-red-600' : 'text-green-600'}`}>
                  {impact.bonus_percentage}%
                </span>
              </div>
            </div>
            
            {hasNegativeImpact && (
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Reduction</div>
                <div className="text-2xl font-bold text-red-600">-{bonusReduction}%</div>
              </div>
            )}
          </div>

          {/* Exceptions Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Total Exceptions</span>
                <span className={`font-semibold ${impact.exceptions.total_exceptions > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {impact.exceptions.total_exceptions}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Warnings</span>
                <span className={`font-semibold ${impact.exceptions.warnings > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {impact.exceptions.warnings}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Justified</span>
                <span className="font-semibold text-blue-600">
                  {impact.exceptions.justified}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">High Severity</span>
                <span className={`font-semibold ${impact.exceptions.high_severity > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {impact.exceptions.high_severity}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Unauthorized</span>
                <span className={`font-semibold ${impact.exceptions.unauthorized_absences > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {impact.exceptions.unauthorized_absences}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Late Arrivals</span>
                <span className={`font-semibold ${impact.exceptions.late_arrivals > 5 ? 'text-orange-600' : 'text-gray-700'}`}>
                  {impact.exceptions.late_arrivals}
                </span>
              </div>
            </div>
          </div>

          {/* Bonus Calculation Breakdown */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">Bonus Calculation</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-800">Base Bonus:</span>
                <span className="font-semibold text-blue-900">100%</span>
              </div>
              
              {impact.exceptions.warnings > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>Warnings ({impact.exceptions.warnings} × 25%):</span>
                  <span className="font-semibold">-{impact.exceptions.warnings * 25}%</span>
                </div>
              )}
              
              {impact.exceptions.high_severity > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>High Severity ({impact.exceptions.high_severity} × 10%):</span>
                  <span className="font-semibold">-{impact.exceptions.high_severity * 10}%</span>
                </div>
              )}
              
              {impact.exceptions.late_arrivals > 5 && (
                <div className="flex justify-between text-red-700">
                  <span>Excessive Late Arrivals:</span>
                  <span className="font-semibold">-15%</span>
                </div>
              )}
              
              {impact.exceptions.unauthorized_absences > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>Unauthorized Absences:</span>
                  <span className="font-semibold">-100%</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-blue-300 flex justify-between">
                <span className="font-semibold text-blue-900">Final Bonus:</span>
                <span className={`font-bold ${impact.bonus_percentage === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {impact.bonus_percentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`p-4 rounded-lg border ${
            impact.bonus_percentage === 100 
              ? 'bg-green-50 border-green-200' 
              : impact.bonus_percentage > 0 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <AlertTriangle className={`w-5 h-5 mr-2 mt-0.5 ${
                impact.bonus_percentage === 100 
                  ? 'text-green-600' 
                  : impact.bonus_percentage > 0 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`} />
              <div>
                <h4 className="font-semibold text-sm mb-1">Recommendation</h4>
                <p className="text-sm text-gray-700">{impact.recommendation}</p>
              </div>
            </div>
          </div>

          {/* View Details Link */}
          <div className="pt-4 border-t">
            <a 
              href={`/hr/attendance/exceptions?employee=${employeeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
            >
              View Full Attendance Details →
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
