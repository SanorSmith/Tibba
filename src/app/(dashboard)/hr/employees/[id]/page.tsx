'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Shield, GraduationCap, Award, Building2, Clock, FileText, Trash2, Pencil, Heart, Target, Star } from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import attendanceData from '@/data/hr/attendance.json';
import leavesData from '@/data/hr/leaves.json';
import trainingData from '@/data/hr/training.json';
import performanceData from '@/data/hr/performance.json';

const categoryColors: Record<string, { bg: string; text: string }> = {
  MEDICAL_STAFF: { bg: '#DBEAFE', text: '#1D4ED8' },
  NURSING: { bg: '#FCE7F3', text: '#BE185D' },
  ADMINISTRATIVE: { bg: '#E0E7FF', text: '#4338CA' },
  TECHNICAL: { bg: '#D1FAE5', text: '#065F46' },
  SUPPORT: { bg: '#FEF3C7', text: '#92400E' },
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const emp = dataStore.getEmployee(params.id as string);
    setEmployee(emp ?? null);
    setLoading(false);
  }, [params.id]);

  const handleDelete = () => {
    if (!hasRole('HR_ADMIN')) {
      toast.error('Only HR Admin can delete employees');
      return;
    }
    const name = `${employee.first_name} ${employee.last_name}`;
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const success = dataStore.deleteEmployee(employee.id);
    if (success) {
      toast.success(`${name} deleted successfully`);
      router.push('/hr/employees');
    } else {
      toast.error('Failed to delete employee');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#618FF5' }} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p style={{ fontSize: '16px', color: '#525252' }}>Employee not found</p>
        <Link href="/hr/employees"><button className="btn-primary mt-4">Back to Directory</button></Link>
      </div>
    );
  }

  const catColor = categoryColors[employee.employee_category] || { bg: '#F3F4F6', text: '#374151' };
  const todayAttendance = attendanceData.daily_summaries.find(a => a.employee_id === employee.id);
  const empLeaves = leavesData.leave_requests.filter(l => l.employee_id === employee.id);
  const empTraining = trainingData.employee_training_records.filter(t => t.employee_id === employee.id);
  const empReview = performanceData.reviews.find(r => r.employee_id === employee.id);
  const empBalance = leavesData.leave_balances.find(b => b.employee_id === employee.id);
  const empBenefits = dataStore.getEmployeeBenefitEnrollments(employee.id).filter((b: any) => b.status === 'ACTIVE');
  const empReviews = dataStore.getEmployeeReviews(employee.id);
  const empGoals = dataStore.getEmployeeGoals(employee.id);
  const empRecognitions = dataStore.getEmployeeRecognitions(employee.id);

  const yearsOfService = Math.floor((new Date().getTime() - new Date(employee.date_of_hire).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/employees">
            <button className="p-2 hover:bg-[#f5f5f5] rounded transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">{employee.first_name} {employee.last_name}</h2>
            <p className="page-description">{employee.job_title} - {employee.department_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/employees/${employee.id}/edit`}>
            <button className="btn-secondary flex items-center gap-1"><Pencil size={14} /> Edit</button>
          </Link>
          {hasRole('HR_ADMIN') && (
            <button onClick={handleDelete} className="flex items-center gap-1" style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #FCA5A5', color: '#EF4444', fontSize: '14px', fontWeight: 500 }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0" style={{ backgroundColor: '#618FF5' }}>
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{employee.first_name} {employee.last_name}</h3>
                <span className="tibbna-badge" style={{ backgroundColor: catColor.bg, color: catColor.text }}>{employee.employee_category.replace('_', ' ')}</span>
                <span className="tibbna-badge" style={{ backgroundColor: employee.employment_status === 'ACTIVE' ? '#D1FAE5' : '#FEF3C7', color: employee.employment_status === 'ACTIVE' ? '#065F46' : '#92400E' }}>
                  {employee.employment_status}
                </span>
              </div>
              {employee.full_name_arabic && <p style={{ fontSize: '14px', color: '#525252', direction: 'rtl' }}>{employee.full_name_arabic}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Mail size={14} /> {employee.email_work}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Phone size={14} /> {employee.phone_mobile}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Calendar size={14} /> Hired: {employee.date_of_hire} ({yearsOfService}y)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Information */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Personal Information</h3></div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ['Employee ID', employee.employee_number],
                  ['Date of Birth', employee.date_of_birth],
                  ['Gender', employee.gender],
                  ['Marital Status', employee.marital_status],
                  ['Nationality', employee.nationality],
                  ['National ID', employee.national_id],
                  ['Blood Type', employee.blood_type],
                  ['Employment Type', employee.employment_type],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: '13px', color: '#a3a3a3' }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Employment Details</h3></div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ['Job Title', employee.job_title],
                  ['Department', employee.department_name],
                  ['Grade', employee.grade_id],
                  ['Hire Date', employee.date_of_hire],
                  ['Reporting To', employee.reporting_to || 'N/A'],
                  ['Shift', employee.shift_id],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: '13px', color: '#a3a3a3' }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><GraduationCap size={16} /> Education</h3></div>
            <div className="tibbna-card-content">
              {employee.education.map((edu: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < employee.education.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0E7FF' }}>
                    <GraduationCap size={14} style={{ color: '#4338CA' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{edu.degree} - {edu.field}</p>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{edu.university}, {edu.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Licenses */}
          {employee.licenses.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Shield size={16} /> Licenses & Certifications</h3></div>
              <div className="tibbna-card-content">
                {employee.licenses.map((lic: any, i: number) => (
                  <div key={i} className="flex items-start justify-between py-2" style={{ borderBottom: i < employee.licenses.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{lic.type.replace(/_/g, ' ')}</p>
                      <p style={{ fontSize: '12px', color: '#525252' }}>{lic.authority} - #{lic.number}</p>
                      <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Expires: {lic.expiry}</p>
                    </div>
                    <span className="tibbna-badge" style={{
                      backgroundColor: lic.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2',
                      color: lic.status === 'ACTIVE' ? '#065F46' : '#991B1B'
                    }}>{lic.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Records */}
          {empTraining.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Award size={16} /> Training Records</h3></div>
              <div className="tibbna-card-content">
                {empTraining.map(tr => (
                  <div key={tr.id} className="flex items-start justify-between py-2" style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{tr.program_name}</p>
                      <p style={{ fontSize: '12px', color: '#525252' }}>Completed: {tr.completion_date} | CME: {tr.cme_credits}</p>
                      {tr.expiry_date && <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Expires: {tr.expiry_date}</p>}
                    </div>
                    <span className="tibbna-badge" style={{
                      backgroundColor: tr.status === 'CURRENT' ? '#D1FAE5' : tr.status === 'EXPIRING_SOON' ? '#FEF3C7' : '#FEE2E2',
                      color: tr.status === 'CURRENT' ? '#065F46' : tr.status === 'EXPIRING_SOON' ? '#92400E' : '#991B1B'
                    }}>{tr.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-4">
          {/* Today's Attendance */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Clock size={16} /> Today&apos;s Attendance</h3></div>
            <div className="tibbna-card-content">
              {todayAttendance ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="flex justify-between" style={{ fontSize: '13px' }}>
                    <span style={{ color: '#a3a3a3' }}>Status</span>
                    <span className="tibbna-badge" style={{
                      backgroundColor: todayAttendance.status === 'PRESENT' ? '#D1FAE5' : todayAttendance.status === 'LEAVE' ? '#FEF3C7' : '#FEE2E2',
                      color: todayAttendance.status === 'PRESENT' ? '#065F46' : todayAttendance.status === 'LEAVE' ? '#92400E' : '#991B1B'
                    }}>{todayAttendance.status}</span>
                  </div>
                  {todayAttendance.first_in && <div className="flex justify-between" style={{ fontSize: '13px' }}><span style={{ color: '#a3a3a3' }}>Check In</span><span style={{ fontWeight: 500 }}>{todayAttendance.first_in}</span></div>}
                  {todayAttendance.last_out && <div className="flex justify-between" style={{ fontSize: '13px' }}><span style={{ color: '#a3a3a3' }}>Check Out</span><span style={{ fontWeight: 500 }}>{todayAttendance.last_out}</span></div>}
                  <div className="flex justify-between" style={{ fontSize: '13px' }}><span style={{ color: '#a3a3a3' }}>Hours</span><span style={{ fontWeight: 500 }}>{todayAttendance.total_hours}h</span></div>
                  {todayAttendance.overtime_hours > 0 && <div className="flex justify-between" style={{ fontSize: '13px' }}><span style={{ color: '#a3a3a3' }}>Overtime</span><span style={{ fontWeight: 500, color: '#F59E0B' }}>{todayAttendance.overtime_hours}h</span></div>}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#a3a3a3', textAlign: 'center', padding: '8px 0' }}>No attendance record today</p>
              )}
            </div>
          </div>

          {/* Leave Balance */}
          {empBalance && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Calendar size={16} /> Leave Balance</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex justify-between items-center" style={{ fontSize: '13px' }}>
                  <span>Annual Leave</span>
                  <span style={{ fontWeight: 600 }}>{empBalance.annual.available}/{empBalance.annual.total}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${(empBalance.annual.used / empBalance.annual.total) * 100}%`, backgroundColor: '#3B82F6', borderRadius: '3px' }} />
                </div>
                <div className="flex justify-between items-center" style={{ fontSize: '13px' }}>
                  <span>Sick Leave</span>
                  <span style={{ fontWeight: 600 }}>{empBalance.sick.available}/{empBalance.sick.total}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${(empBalance.sick.used / empBalance.sick.total) * 100}%`, backgroundColor: '#EF4444', borderRadius: '3px' }} />
                </div>
                <div className="flex justify-between items-center" style={{ fontSize: '13px' }}>
                  <span>Emergency</span>
                  <span style={{ fontWeight: 600 }}>{empBalance.emergency.available}/{empBalance.emergency.total}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${(empBalance.emergency.used / empBalance.emergency.total) * 100}%`, backgroundColor: '#F59E0B', borderRadius: '3px' }} />
                </div>
              </div>
            </div>
          )}

          {/* Performance Reviews */}
          {empReviews.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Star size={16} /> Reviews ({empReviews.length})</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {empReviews.map((r: any) => (
                  <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontWeight: 700, fontSize: '18px', color: r.overall_rating >= 4 ? '#10B981' : r.overall_rating >= 3 ? '#F59E0B' : '#EF4444' }}>{r.overall_rating}/5</span>
                      <span className="tibbna-badge" style={{ backgroundColor: r.status === 'FINALIZED' ? '#D1FAE5' : '#FEF3C7', color: r.status === 'FINALIZED' ? '#065F46' : '#92400E', fontSize: '10px' }}>{r.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#a3a3a3' }}>By: {r.reviewer || r.reviewer_name || '-'}</p>
                    {r.recommendation && <p style={{ fontSize: '12px', color: '#6366F1', marginTop: '2px' }}>{r.recommendation}</p>}
                  </div>
                ))}
                <Link href="/hr/performance" style={{ fontSize: '12px', color: '#618FF5', fontWeight: 600, marginTop: '4px' }}>All Reviews →</Link>
              </div>
            </div>
          )}

          {/* Goals */}
          {empGoals.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Target size={16} /> Goals ({empGoals.length})</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {empGoals.slice(0, 5).map((g: any) => {
                  const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                  return (
                    <div key={g.goal_id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{g.goal_title}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: pct >= 100 ? '#10B981' : '#F59E0B' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px', marginTop: '4px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444', borderRadius: '2px' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '2px' }}>{g.goal_category}{g.due_date ? ` · Due: ${g.due_date}` : ''}</p>
                    </div>
                  );
                })}
                <Link href="/hr/performance/goals" style={{ fontSize: '12px', color: '#618FF5', fontWeight: 600, marginTop: '4px' }}>Manage Goals →</Link>
              </div>
            </div>
          )}

          {/* Recognitions */}
          {empRecognitions.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Award size={16} /> Recognitions ({empRecognitions.length})</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {empRecognitions.map((rec: any) => (
                  <div key={rec.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{rec.title}</span>
                      <span className="tibbna-badge badge-warning" style={{ fontSize: '10px' }}>{rec.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{rec.date}{(rec.monetary_reward || 0) > 0 ? ` · ${(rec.monetary_reward / 1000).toFixed(0)}K IQD` : ''}</p>
                  </div>
                ))}
                <Link href="/hr/performance" style={{ fontSize: '12px', color: '#618FF5', fontWeight: 600, marginTop: '4px' }}>View All →</Link>
              </div>
            </div>
          )}

          {/* Benefits */}
          {empBenefits.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Heart size={16} /> Benefits ({empBenefits.length})</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {empBenefits.map((b: any) => (
                  <div key={b.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{b.plan_name}</span>
                      <span className="tibbna-badge" style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '10px' }}>{b.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Since {b.start_date || '-'}{b.dependents ? ` · ${b.dependents} dependents` : ''}</p>
                  </div>
                ))}
                <Link href="/hr/benefits" style={{ fontSize: '12px', color: '#618FF5', fontWeight: 600, marginTop: '4px' }}>Manage Benefits →</Link>
              </div>
            </div>
          )}

          {/* Recent Leaves */}
          {empLeaves.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Recent Leaves</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {empLeaves.slice(0, 3).map(lr => (
                  <div key={lr.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{lr.leave_type}</span>
                      <span className="tibbna-badge" style={{
                        backgroundColor: lr.status === 'APPROVED' ? '#D1FAE5' : lr.status === 'PENDING_APPROVAL' ? '#FEF3C7' : '#FEE2E2',
                        color: lr.status === 'APPROVED' ? '#065F46' : lr.status === 'PENDING_APPROVAL' ? '#92400E' : '#991B1B',
                        fontSize: '10px'
                      }}>{lr.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#a3a3a3' }}>{lr.start_date} to {lr.end_date} ({lr.total_days}d)</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
