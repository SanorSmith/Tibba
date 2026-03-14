'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Briefcase, Clock, DollarSign, Award, AlertTriangle, CheckCircle, BarChart3, PieChart, Activity, Download } from 'lucide-react';

export default function RecruitmentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/recruitment/analytics?range=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Recruitment Analytics</h2>
          <p className="page-description">Recruitment metrics and decision engine insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="tibbna-input"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
          <button className="btn-primary flex items-center gap-2">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Applicants</p>
                <p className="tibbna-card-value">{analytics?.totalApplicants || 0}</p>
                <p className="text-xs text-green-600">+12% from last period</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EBF8FF' }}>
                <Users size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Hire Rate</p>
                <p className="tibbna-card-value">{analytics?.hireRate || 0}%</p>
                <p className="text-xs text-green-600">+5% from last period</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle size={20} style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Avg Time to Hire</p>
                <p className="tibbna-card-value">{analytics?.avgTimeToHire || 0}d</p>
                <p className="text-xs text-red-600">-3 days from last period</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Clock size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Cost per Hire</p>
                <p className="tibbna-card-value">{analytics?.costPerHire || 0}M IQD</p>
                <p className="text-xs text-green-600">-8% from last period</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <DollarSign size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recruitment Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Recruitment Funnel</h3>
          </div>
          <div className="tibbna-card-content">
            <div className="space-y-4">
              {[
                { stage: 'Applied', count: analytics?.funnel?.applied || 0, color: '#3B82F6' },
                { stage: 'Screening', count: analytics?.funnel?.screening || 0, color: '#8B5CF6' },
                { stage: 'Interviewing', count: analytics?.funnel?.interviewing || 0, color: '#F59E0B' },
                { stage: 'Offered', count: analytics?.funnel?.offered || 0, color: '#6366F1' },
                { stage: 'Hired', count: analytics?.funnel?.hired || 0, color: '#10B981' },
              ].map((stage, index) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{stage.stage}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{stage.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(stage.count / (analytics?.funnel?.applied || 1)) * 100}%`,
                          backgroundColor: stage.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Source Performance</h3>
          </div>
          <div className="tibbna-card-content">
            <div className="space-y-3">
              {[
                { source: 'LinkedIn', applicants: 45, hired: 8, rate: '17.8%' },
                { source: 'Website', applicants: 32, hired: 5, rate: '15.6%' },
                { source: 'Referral', applicants: 18, hired: 6, rate: '33.3%' },
                { source: 'Job Board', applicants: 28, hired: 4, rate: '14.3%' },
              ].map((source, index) => (
                <div key={source.source} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{source.source}</p>
                    <p style={{ fontSize: '11px', color: '#6B7280' }}>
                      {source.applicants} applicants, {source.hired} hired
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: '14px', fontWeight: 700, color: source.rate === '33.3%' ? '#10B981' : '#6B7280' }}>
                      {source.rate}
                    </p>
                    <p style={{ fontSize: '10px', color: '#6B7280' }}>hire rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Engine Insights */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title">Decision Engine Insights</h3>
        </div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Top Performing Candidates</h4>
              <div className="space-y-2">
                {[
                  { name: 'Mohammed Al-Saadi', score: 92, status: 'HIRED' },
                  { name: 'Hala Al-Jubouri', score: 88, status: 'OFFERED' },
                  { name: 'Zaid Al-Rawi', score: 85, status: 'INTERVIEWING' },
                ].map((candidate, index) => (
                  <div key={candidate.name} className="flex items-center justify-between p-2 border rounded">
                    <span style={{ fontSize: '12px' }}>{candidate.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${candidate.score >= 90 ? 'text-green-600' : candidate.score >= 80 ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {candidate.score}
                      </span>
                      <span className="tibbna-badge" style={{ fontSize: '9px' }}>
                        {candidate.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Automated Recommendations</h4>
              <div className="space-y-2">
                {[
                  { action: 'Schedule interviews', candidates: 5, priority: 'HIGH' },
                  { action: 'Send offers', candidates: 3, priority: 'MEDIUM' },
                  { action: 'Reject unqualified', candidates: 8, priority: 'LOW' },
                ].map((rec, index) => (
                  <div key={rec.action} className="flex items-center justify-between p-2 border rounded">
                    <span style={{ fontSize: '12px' }}>{rec.action}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{rec.candidates} candidates</span>
                      <span className={`tibbna-badge badge-${rec.priority.toLowerCase()}`} style={{ fontSize: '9px' }}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Risk Indicators</h4>
              <div className="space-y-2">
                {[
                  { risk: 'High salary expectations', count: 3, level: 'HIGH' },
                  { risk: 'Limited experience', count: 5, level: 'MEDIUM' },
                  { risk: 'Missing qualifications', count: 2, level: 'HIGH' },
                ].map((risk, index) => (
                  <div key={risk.risk} className="flex items-center justify-between p-2 border rounded">
                    <span style={{ fontSize: '12px' }}>{risk.risk}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{risk.count} candidates</span>
                      <span className={`tibbna-badge badge-${risk.level.toLowerCase()}`} style={{ fontSize: '9px' }}>
                        {risk.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
