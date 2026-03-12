'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Shield, GraduationCap, Award, Building2, Clock, FileText, Trash2, Pencil, Heart, Target, Star, Save, User, Briefcase } from 'lucide-react';
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
    loadEmployee();
  }, [params.id]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?id=${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setEmployee(data.staff);
      } else {
        console.error('❌ Error loading employee:', data.error);
        setEmployee(null);
      }
    } catch (error) {
      console.error('❌ Error loading employee:', error);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!hasRole('HR_ADMIN')) {
      toast.error('Only HR Admin can delete employees');
      return;
    }
    const name = `${employee.firstName} ${employee.lastName}`;
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const response = await fetch(`/api/staff?staffId=${employee.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${name} deleted successfully`);
        router.push('/hr/employees');
      } else {
        toast.error(result.error || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
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

  const catColor = categoryColors[employee.unit || ''] || { bg: '#F3F4F6', text: '#374151' };
  const todayAttendance = attendanceData.daily_summaries.find(a => a.employee_id === employee.id);
  const empLeaves = leavesData.leave_requests.filter(l => l.employee_id === employee.id);
  const empTraining = trainingData.employee_training_records.filter(t => t.employee_id === employee.id);
  const empReview = performanceData.reviews.find(r => r.employee_id === employee.id);
  const empBalance = leavesData.leave_balances.find(b => b.employee_id === employee.id);
  
  // Mock data for performance/benefits since these aren't in the API yet
  const empBenefits: any[] = [];
  const empReviews: any[] = [];
  const empGoals: any[] = [];
  const empRecognitions: any[] = [];

  const yearsOfService = Math.floor((new Date().getTime() - new Date(employee.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

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
            <h2 className="page-title">{employee.firstName} {employee.lastName}</h2>
            <p className="page-description">{employee.role} - {employee.unit || 'No department'}</p>
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
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{employee.firstName} {employee.middleName ? employee.middleName + ' ' : ''}{employee.lastName}</h3>
                <span className="tibbna-badge" style={{ backgroundColor: catColor.bg, color: catColor.text }}>{employee.unit || 'General'}</span>
                <span className="tibbna-badge" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                  Active
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Mail size={14} /> {employee.email}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Phone size={14} /> {employee.phone}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Calendar size={14} /> Hired: {new Date(employee.createdAt).toLocaleDateString()} ({yearsOfService}y)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Progress Indicator */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                  <User size={18} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>Personal Info</span>
              </div>
              <div className="h-0.5 flex-1 mx-2" style={{ backgroundColor: '#E5E7EB', marginBottom: '20px' }}></div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                  <Briefcase size={18} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF' }}>Employment</span>
              </div>
              <div className="h-0.5 flex-1 mx-2" style={{ backgroundColor: '#E5E7EB', marginBottom: '20px' }}></div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                  <FileText size={18} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF' }}>Profile</span>
              </div>
              <div className="h-0.5 flex-1 mx-2" style={{ backgroundColor: '#E5E7EB', marginBottom: '20px' }}></div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                  <Save size={18} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#9CA3AF' }}>Review & Submit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Employee Details */}
      <div className="space-y-4">
        {/* Personal Information Section */}
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Personal Information</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            {/* Full Name */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Full Name</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>First Name</label>
                  <div className="tibbna-input bg-gray-50">{employee.firstName || 'Not set'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Middle Name</label>
                  <div className="tibbna-input bg-gray-50">{employee.middleName || 'Not set'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Last Name</label>
                  <div className="tibbna-input bg-gray-50">{employee.lastName || 'Not set'}</div>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Date of Birth</label>
                  <div className="tibbna-input bg-gray-50">
                    {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Gender</label>
                  <div className="tibbna-input bg-gray-50">{employee.gender || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Marital Status</label>
                  <div className="tibbna-input bg-gray-50">{employee.maritalStatus || 'Not specified'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Nationality</label>
                  <div className="tibbna-input bg-gray-50">{employee.nationality || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>National ID</label>
                  <div className="tibbna-input bg-gray-50">{employee.nationalId || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Work Email</label>
                  <div className="tibbna-input bg-gray-50">{employee.email || 'Not set'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Mobile Phone</label>
                  <div className="tibbna-input bg-gray-50">{employee.phone || 'Not set'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Address</label>
                  <div className="tibbna-input bg-gray-50">{employee.address || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Contact Name</label>
                  <div className="tibbna-input bg-gray-50">{employee.emergencyContactName || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Relationship</label>
                  <div className="tibbna-input bg-gray-50">{employee.emergencyContactRelationship || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Phone</label>
                  <div className="tibbna-input bg-gray-50">{employee.emergencyContactPhone || 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Employment Details Section */}
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Employment Details</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            {/* Position */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Position</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Job Title</label>
                  <div className="tibbna-input bg-gray-50">{employee.jobTitle || employee.role || 'Not set'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Department</label>
                  <div className="tibbna-input bg-gray-50">{employee.unit || 'Not set'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Specialty</label>
                  <div className="tibbna-input bg-gray-50">{employee.specialty || 'Not specified'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Employee Category</label>
                  <div className="tibbna-input bg-gray-50">{employee.employeeCategory || employee.role || 'Staff'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Employment Type</label>
                  <div className="tibbna-input bg-gray-50">{employee.employmentType || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Date of Hire</label>
                  <div className="tibbna-input bg-gray-50">
                    {employee.dateOfHire ? new Date(employee.dateOfHire).toLocaleDateString() : (employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : 'Not set')}
                  </div>
                </div>
              </div>
            </div>

            {/* Compensation */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Compensation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Salary Grade</label>
                  <div className="tibbna-input bg-gray-50">{employee.gradeId || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Basic Salary (IQD)</label>
                  <div className="tibbna-input bg-gray-50">{employee.basicSalary ? employee.basicSalary.toLocaleString() : 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Shift Pattern</label>
                  <div className="tibbna-input bg-gray-50">Not specified</div>
                </div>
              </div>
            </div>

            {/* Settlement Rules & Deductions */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Settlement Rules & Deductions</h3>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Configure pension, social security, tax, and end-of-service settlement rules</div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Pension Scheme</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Pension Eligible</label>
                    <div className="tibbna-input bg-gray-50">{employee.pensionEligible !== undefined ? (employee.pensionEligible ? 'Yes' : 'No') : 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Pension Scheme</label>
                    <div className="tibbna-input bg-gray-50">{employee.pensionScheme || 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Pension Start Date</label>
                    <div className="tibbna-input bg-gray-50">{employee.pensionStartDate ? new Date(employee.pensionStartDate).toLocaleDateString() : 'Not specified'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Employee Contribution (%)</label>
                    <div className="tibbna-input bg-gray-50">{employee.pensionContributionRate || 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Employer Contribution (%)</label>
                    <div className="tibbna-input bg-gray-50">{employee.employerPensionRate || 'Not specified'}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Deductions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Social Security Number</label>
                    <div className="tibbna-input bg-gray-50">{employee.socialSecurityNumber || 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Social Security Rate (%)</label>
                    <div className="tibbna-input bg-gray-50">{employee.socialSecurityRate || 'Not specified'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Tax ID Number</label>
                    <div className="tibbna-input bg-gray-50">{employee.taxIdNumber || 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Tax Exemption Amount (IQD)</label>
                    <div className="tibbna-input bg-gray-50">{employee.taxExemptionAmount ? employee.taxExemptionAmount.toLocaleString() : 'Not specified'}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>End-of-Service Settlement</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Settlement Eligible</label>
                    <div className="tibbna-input bg-gray-50">{employee.settlementEligible !== undefined ? (employee.settlementEligible ? 'Yes' : 'No') : 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Calculation Method</label>
                    <div className="tibbna-input bg-gray-50">{employee.settlementCalculationMethod || 'Not specified'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Notice Period (Days)</label>
                    <div className="tibbna-input bg-gray-50">{employee.noticePeriodDays || 'Not specified'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Gratuity Eligible</label>
                    <div className="tibbna-input bg-gray-50">{employee.gratuityEligible !== undefined ? (employee.gratuityEligible ? 'Yes' : 'No') : 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Bank Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Bank Name</label>
                  <div className="tibbna-input bg-gray-50">{employee.bankName || 'Not specified'}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Account Number</label>
                  <div className="tibbna-input bg-gray-50">{employee.bankAccountNumber || 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Profile Section */}
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Employee Profile</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>CV, education, work history, and professional information</p>
          </div>
          <div className="tibbna-card-content space-y-5">
            {/* Professional Summary */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Professional Summary</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>CV Summary</label>
                  <div className="tibbna-input bg-gray-50" style={{ minHeight: '100px' }}>{employee.cvSummary || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Education</h3>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Educational qualifications (degrees, diplomas, certificates)</div>
              <div className="space-y-3">
                {employee.education && Array.isArray(employee.education) ? (
                  employee.education.map((edu: any, index: number) => (
                    <div key={index} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{edu.degree || 'Degree'}</div>
                      <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2px' }}>{edu.institution || 'Institution'}</div>
                      <div style={{ color: '#9ca3af', fontSize: '13px' }}>{edu.year || 'Year'}{edu.field ? ` • ${edu.field}` : ''}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
                    No education records added yet
                  </div>
                )}
              </div>
            </div>

            {/* Work History */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Work History</h3>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Previous employment and work experience</div>
              <div className="space-y-3">
                {employee.workHistory && Array.isArray(employee.workHistory) ? (
                  employee.workHistory.map((work: any, index: number) => (
                    <div key={index} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{work.position || 'Position'}</div>
                      <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2px' }}>{work.company || 'Company'}</div>
                      <div style={{ color: '#9ca3af', fontSize: '13px' }}>{work.startDate || 'Start'} - {work.endDate || 'Present'}</div>
                      {work.description && <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>{work.description}</div>}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
                    No work history added yet
                  </div>
                )}
              </div>
            </div>

            {/* Certifications & Licenses */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Certifications & Licenses</h3>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Professional certifications, licenses, and credentials</div>
              <div className="space-y-3">
                {employee.certifications && Array.isArray(employee.certifications) ? (
                  employee.certifications.map((cert: any, index: number) => (
                    <div key={index} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{cert.name || 'Certification'}</div>
                      <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2px' }}>{cert.issuer || 'Issuer'}</div>
                      <div style={{ color: '#9ca3af', fontSize: '13px' }}>{cert.date || 'Date'}{cert.expiry ? ` • Expires: ${cert.expiry}` : ''}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
                    No certifications added yet
                  </div>
                )}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Languages</h3>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Languages spoken and proficiency levels</div>
              <div className="space-y-3">
                {employee.languages && Array.isArray(employee.languages) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {employee.languages.map((lang: any, index: number) => (
                      <span key={index} style={{ padding: '6px 12px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }}>
                        {lang.name || lang.language || 'Language'}{lang.proficiency ? ` (${lang.proficiency})` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
                    No languages added yet
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e7' }}>Skills</h3>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Professional skills and competencies</div>
              <div className="space-y-3">
                {employee.skills && Array.isArray(employee.skills) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {employee.skills.map((skill: any, index: number) => (
                      <span key={index} style={{ padding: '6px 12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }}>
                        {skill.name || skill.skill || 'Skill'}{skill.level ? ` (${skill.level})` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
                    No skills added yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        </div>
    </>
  );
}
