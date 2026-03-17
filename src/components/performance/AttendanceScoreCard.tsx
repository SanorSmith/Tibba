'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface AttendanceScoreProps {
  employeeId: string;
  reviewPeriod: { start_date: string; end_date: string };
}

interface AttendanceScoreData {
  attendance_score: number;
  attendance_rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  impact_on_overall: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  recommendations: string[];
  trend_analysis: string;
  exceptions_breakdown: {
    total_exceptions: number;
    warnings: number;
    justified: number;
    high_severity: number;
    late_arrivals: number;
    early_departures: number;
    missing_checkout: number;
    unauthorized_absences: number;
  };
}

export default function AttendanceScoreCard({ employeeId, reviewPeriod }: AttendanceScoreProps) {
  const [score, setScore] = useState<AttendanceScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScore();
  }, [employeeId, reviewPeriod]);

  const fetchScore = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hr/performance/attendance-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employee_id: employeeId, 
          review_period: reviewPeriod 
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setScore(data.data);
      } else {
        // If employee not found, show a helpful message
        if (data.error?.includes('not found') || data.error?.includes('No attendance data')) {
          setError('No attendance data available for this employee');
        } else {
          setError(data.error || 'Failed to fetch attendance score');
        }
      }
    } catch (err: any) {
      console.error('Error fetching attendance score:', err);
      setError('Unable to load attendance data. This employee may not have attendance records.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading attendance score...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Performance</CardTitle>
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

  if (!score) return null;

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (scoreValue >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreBgColor = (scoreValue: number) => {
    if (scoreValue >= 85) return 'bg-green-500';
    if (scoreValue >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRatingIcon = (rating: string) => {
    if (rating === 'EXCELLENT' || rating === 'GOOD') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

  const getImpactIcon = (impact: string) => {
    if (impact === 'POSITIVE') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (impact === 'NEGATIVE') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <div className="w-5 h-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`relative w-24 h-24 rounded-full border-4 ${getScoreColor(score.attendance_score)}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{score.attendance_score}</div>
                    <div className="text-xs">/ 100</div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  {getRatingIcon(score.attendance_rating)}
                  <span className="text-lg font-semibold">{score.attendance_rating}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {getImpactIcon(score.impact_on_overall)}
                  <span>Impact: {score.impact_on_overall}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{score.trend_analysis}</div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${getScoreBgColor(score.attendance_score)}`}
              style={{ width: `${score.attendance_score}%` }}
            />
          </div>

          {/* Exceptions Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Exceptions:</span>
                <span className="font-semibold">{score.exceptions_breakdown.total_exceptions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Warnings:</span>
                <span className={`font-semibold ${score.exceptions_breakdown.warnings > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {score.exceptions_breakdown.warnings}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Justified:</span>
                <span className="font-semibold text-blue-600">{score.exceptions_breakdown.justified}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High Severity:</span>
                <span className={`font-semibold ${score.exceptions_breakdown.high_severity > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {score.exceptions_breakdown.high_severity}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Late Arrivals:</span>
                <span className="font-semibold">{score.exceptions_breakdown.late_arrivals}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Early Departures:</span>
                <span className="font-semibold">{score.exceptions_breakdown.early_departures}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Missing Checkout:</span>
                <span className="font-semibold">{score.exceptions_breakdown.missing_checkout}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unauthorized:</span>
                <span className={`font-semibold ${score.exceptions_breakdown.unauthorized_absences > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {score.exceptions_breakdown.unauthorized_absences}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {score.recommendations.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                Recommendations
              </h4>
              <ul className="space-y-1">
                {score.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
