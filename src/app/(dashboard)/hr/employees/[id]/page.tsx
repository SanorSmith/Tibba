'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Calendar, Trash2, Pencil, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  ON_LEAVE: { bg: '#FEF3C7', text: '#92400E' },
  TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
  SUSPENDED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  async function loadEmployee() {
    setLoading(true);
    setError(null);

    console.log('🔍 Loading employee:', employeeId);

    try {
      const response = await fetch(`/api/employees/${employeeId}`);

      console.log('📡 Response status:', response.status);

      const result = await response.json();

      console.log('📦 Response data:', result);

      if (result.success) {
        setEmployee(result.data);
        console.log('✅ Employee loaded successfully');
      } else {
        console.error('❌ Failed to load employee:', result.error);
        setError(result.error || 'Failed to load employee');
        toast.error(result.error || 'Employee not found');
      }
    } catch (error: any) {
      console.error('💥 Error loading employee:', error);
      setError('Network error - please try again');
      toast.error('Failed to load employee');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Employee deleted successfully');
        router.push('/hr/employees');
      } else {
        toast.error('Failed to delete employee');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#618FF5' }} />
          <p style={{ color: '#a3a3a3', fontSize: '14px' }}>Loading employee...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
          <Trash2 size={28} style={{ color: '#EF4444' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Error Loading Employee</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>{error}</p>
        <Link href="/hr/employees"><button className="btn-primary">Back to Directory</button></Link>
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

  const deptName = employee.department?.name || '—';
  const hireDate = employee.hire_date || '—';
  const yearsOfService = employee.hire_date
    ? Math.floor((new Date().getTime() - new Date(employee.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;
  const statColor = statusColors[employee.employment_status] || { bg: '#F3F4F6', text: '#374151' };

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
            <p className="page-description">{employee.job_title} — {deptName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/employees/${employee.id}/edit`}>
            <button className="btn-secondary flex items-center gap-1"><Pencil size={14} /> Edit</button>
          </Link>
          {hasRole('HR_ADMIN') && (
            <button
              onClick={() => setDeleteModal(true)}
              className="flex items-center gap-1"
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #FCA5A5', color: '#EF4444', fontSize: '14px', fontWeight: 500 }}
            >
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
              {(employee.first_name || '?')[0]}{(employee.last_name || '?')[0]}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{employee.first_name} {employee.last_name}</h3>
                <span className="tibbna-badge" style={{ backgroundColor: statColor.bg, color: statColor.text }}>
                  {employee.employment_status || '—'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Mail size={14} /> {employee.email || '—'}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Phone size={14} /> {employee.phone || '—'}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: '#525252' }}>
                  <Calendar size={14} /> Hired: {hireDate} {yearsOfService > 0 ? `(${yearsOfService}y)` : ''}
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
                  ['Date of Birth', employee.date_of_birth || '—'],
                  ['Gender', employee.gender || '—'],
                  ['Marital Status', employee.marital_status || '—'],
                  ['Nationality', employee.nationality || '—'],
                  ['National ID', employee.national_id || '—'],
                  ['Employment Type', employee.employment_type || '—'],
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
                  ['Job Title', employee.job_title || '—'],
                  ['Department', deptName],
                  ['Salary Grade', employee.salary_grade || '—'],
                  ['Hire Date', hireDate],
                  ['Base Salary', employee.base_salary ? `${Number(employee.base_salary).toLocaleString()} ${employee.currency || 'IQD'}` : '—'],
                  ['Status', employee.employment_status || '—'],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: '13px', color: '#a3a3a3' }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Qualifications */}
          {employee.qualifications && Array.isArray(employee.qualifications) && employee.qualifications.length > 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Qualifications</h3></div>
              <div className="tibbna-card-content">
                {employee.qualifications.map((q: any, i: number) => (
                  <div key={i} className="py-2" style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{q.degree || q.name || JSON.stringify(q)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-4">
          {/* Department Info */}
          {employee.department && (
            <div className="tibbna-card">
              <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Building2 size={16} /> Department</h3></div>
              <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="flex justify-between" style={{ fontSize: '13px' }}>
                  <span style={{ color: '#a3a3a3' }}>Name</span>
                  <span style={{ fontWeight: 500 }}>{employee.department.name}</span>
                </div>
                {employee.department.code && (
                  <div className="flex justify-between" style={{ fontSize: '13px' }}>
                    <span style={{ color: '#a3a3a3' }}>Code</span>
                    <span style={{ fontWeight: 500 }}>{employee.department.code}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}><Mail size={16} /> Contact</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#a3a3a3' }}>Email</span>
                <span style={{ fontWeight: 500 }}>{employee.email || '—'}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#a3a3a3' }}>Phone</span>
                <span style={{ fontWeight: 500 }}>{employee.phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Compensation</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#a3a3a3' }}>Salary Grade</span>
                <span style={{ fontWeight: 500 }}>{employee.salary_grade || '—'}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#a3a3a3' }}>Base Salary</span>
                <span style={{ fontWeight: 500 }}>
                  {employee.base_salary ? `${Number(employee.base_salary).toLocaleString()} ${employee.currency || 'IQD'}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Delete Employee</h3>
            <p style={{ fontSize: '14px', color: '#525252', marginBottom: '20px' }}>
              Are you sure you want to delete <strong>{employee.first_name} {employee.last_name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#EF4444', color: 'white', fontSize: '14px', fontWeight: 500, opacity: deleting ? 0.5 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
