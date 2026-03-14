'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Download, Upload, Users, Briefcase, Calendar, CheckCircle, XCircle, AlertTriangle, TrendingUp, FileText, Mail, Phone, Star, Eye, Edit, Trash2 } from 'lucide-react';
import { SmartStatusBadge } from '@/components/modules/hr/shared/status-badge';

export default function ApplicantsManagementPage() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vacancyFilter, setVacancyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const stats = {
    total: applicants.length,
    new: applicants.filter(a => a.status === 'NEW').length,
    screening: applicants.filter(a => a.status === 'SCREENING').length,
    interviewing: applicants.filter(a => a.status === 'INTERVIEWING').length,
    offered: applicants.filter(a => a.status === 'OFFERED').length,
    hired: applicants.filter(a => a.status === 'HIRED').length,
    rejected: applicants.filter(a => a.status === 'REJECTED').length
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hr/recruitment?type=candidates');
      const data = await response.json();
      
      if (data.success) {
        setApplicants(data.data);
      }
    } catch (error) {
      console.error('Error fetching applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedApplicants.length === 0) {
      alert('Please select applicants first');
      return;
    }

    try {
      const response = await fetch('/api/hr/recruitment/applicants/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          applicantIds: selectedApplicants
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchApplicants();
        setSelectedApplicants([]);
        setShowBulkActions(false);
        alert(`${action} completed successfully!`);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error performing bulk action');
    }
  };

  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = applicant.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         applicant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || applicant.status === statusFilter;
    const matchesVacancy = vacancyFilter === 'all' || applicant.vacancy_position?.toLowerCase().includes(vacancyFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesVacancy;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'name':
        return a.first_name.localeCompare(b.first_name);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'expected_salary':
        return parseFloat(b.expected_salary) - parseFloat(a.expected_salary);
      default:
        return 0;
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Applicant Management</h2>
          <p className="page-description">Manage recruitment pipeline and applicant decisions</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/recruitment/applicants/create">
            <button className="btn-primary flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Add Applicant</span>
            </button>
          </Link>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="tibbna-grid-6 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Applicants</p>
                <p className="tibbna-card-value">{stats.total}</p>
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
                <p className="tibbna-card-title">New Applications</p>
                <p className="tibbna-card-value">{stats.new}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <AlertTriangle size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">In Progress</p>
                <p className="tibbna-card-value">{stats.screening + stats.interviewing}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Calendar size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Offers Extended</p>
                <p className="tibbna-card-value">{stats.offered}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <Mail size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Hired</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.hired}</p>
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
                <p className="tibbna-card-title">Rejected</p>
                <p className="tibbna-card-value" style={{ color: '#EF4444' }}>{stats.rejected}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <XCircle size={20} style={{ color: '#EF4444' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="tibbna-card">
        <div className="tibbna-card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applicants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="tibbna-input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="tibbna-input"
              >
                <option value="all">All Status</option>
                <option value="NEW">New</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEWING">Interviewing</option>
                <option value="OFFERED">Offered</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                value={vacancyFilter}
                onChange={(e) => setVacancyFilter(e.target.value)}
                className="tibbna-input"
              >
                <option value="all">All Positions</option>
                <option value="emergency physician">Emergency Physician</option>
                <option value="staff nurse">Staff Nurse - ICU</option>
                <option value="lab technician">Lab Technician</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="tibbna-input"
              >
                <option value="created_at">Date Applied</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="expected_salary">Expected Salary</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedApplicants.length > 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">{selectedApplicants.length} applicants selected</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('screening')}
                  className="btn-secondary text-sm"
                >
                  Move to Screening
                </button>
                <button
                  onClick={() => handleBulkAction('interviewing')}
                  className="btn-secondary text-sm"
                >
                  Schedule Interviews
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="btn-error text-sm"
                >
                  Reject Selected
                </button>
                <button
                  onClick={() => setShowBulkActions(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applicants Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-match-title">Applicants ({filteredApplicants.length})</h3>
        </div>
        <div className="tibbna-card-content">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading applicants...</p>
            </div>
          ) : filteredApplicants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedApplicants.length === filteredApplicants.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApplicants(filteredApplicants.map((applicant: any) => applicant.id));
                          } else {
                            setSelectedApplicants([]);
                          }
                        }}
                      />
                    </th>
                    <th>Applicant</th>
                    <th>Position</th>
                    <th>Applied</th>
                    <th>Experience</th>
                    <th>Expected Salary</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicants.map((applicant) => (
                    <tr key={applicant.id} className="hover:bg-gray-50">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedApplicants.includes(applicant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedApplicants([...selectedApplicants, applicant.id]);
                            } else {
                              setSelectedApplicants(selectedApplicants.filter(id => id !== applicant.id));
                            }
                          }}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {applicant.first_name.charAt(0)}{applicant.last_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600 }}>
                              {applicant.first_name} {applicant.last_name}
                            </p>
                            <p style={{ fontSize: '11px', color: '#6B7280' }}>
                              {applicant.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontSize: '13px' }}>
                          {applicant.vacancy_position || '-'}
                        </p>
                      </td>
                      <td>
                        <p style={{ fontSize: '12px', color: '#6B7280' }}>
                          {new Date(applicant.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td>
                        <p style={{ fontSize: '13px' }}>
                          {applicant.experience_years} years
                        </p>
                        <p style={{ fontSize: '11px', color: '#6B7280' }}>
                          {applicant.education}
                        </p>
                      </td>
                      <td>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>
                          {(parseFloat(applicant.expected_salary) / 1000000).toFixed(1)}M IQD
                        </p>
                      </td>
                      <td>
                        <span className="tibbna-badge badge-info" style={{ fontSize: '10px' }}>
                          {applicant.source}
                        </span>
                      </td>
                      <td>
                        <SmartStatusBadge status={applicant.status} />
                      </td>
                      <td>
                        <span className={`font-medium ${getScoreColor(75)}`}>
                          75
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            onClick={() => window.location.href = `/hr/recruitment/candidates/${applicant.id}`}
                            className="btn-secondary p-1"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => window.location.href = `/hr/recruitment/candidates/${applicant.id}`}
                            className="btn-secondary p-1"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p style={{ color: '#6B7280' }}>No applicants found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
