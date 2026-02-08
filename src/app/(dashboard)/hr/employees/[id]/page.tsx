'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Shield, GraduationCap, Award, Building2, Clock, FileText } from 'lucide-react';
import employeesData from '@/data/hr/employees.json';
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
  const employee = employeesData.employees.find(e => e.id === params.id);

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
          <button className="btn-secondary">Edit Profile</button>
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
              {employee.education.map((edu, i) => (
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
                {employee.licenses.map((lic, i) => (
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

          {/* Performance */}
          {empReview && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Performance Review</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="flex justify-between" style={{ fontSize: '13px' }}>
                  <span style={{ color: '#a3a3a3' }}>Overall Rating</span>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: empReview.overall_rating >= 4 ? '#10B981' : empReview.overall_rating >= 3 ? '#F59E0B' : '#EF4444' }}>
                    {empReview.overall_rating}/5
                  </span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '13px' }}>
                  <span style={{ color: '#a3a3a3' }}>Status</span>
                  <span className="tibbna-badge badge-info">{empReview.status}</span>
                </div>
                {empReview.recommendation && (
                  <p style={{ fontSize: '12px', color: '#525252', marginTop: '4px' }}>{empReview.recommendation}</p>
                )}
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
