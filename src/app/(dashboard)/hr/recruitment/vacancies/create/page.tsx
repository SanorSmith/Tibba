'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Briefcase, MapPin, DollarSign, Calendar, Users } from 'lucide-react';

export default function CreateVacancyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    position: '',
    department: '',
    department_id: '',
    openings: 1,
    posting_date: new Date().toISOString().split('T')[0],
    deadline: '',
    priority: 'NORMAL',
    grade: '',
    salary_min: '',
    salary_max: '',
    recruiter: '',
    description: '',
    requirements: ''
  });

  const departments = [
    { id: 'DEP-007', name: 'Emergency Department' },
    { id: 'DEP-008', name: 'Intensive Care Unit' },
    { id: 'DEP-009', name: 'Laboratory' },
    { id: 'DEP-011', name: 'Pharmacy' },
    { id: 'DEP-005', name: 'Pediatrics' },
    { id: 'DEP-015', name: 'Information Technology' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate vacancy number
      const vacancyNumber = `VAC-${new Date().getFullYear()}-00${Math.floor(Math.random() * 1000)}`;

      const response = await fetch('/api/hr/recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'vacancy',
          data: {
            vacancy_number: vacancyNumber,
            ...formData,
            status: 'OPEN'
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/hr/recruitment/vacancies/${result.data.id}`);
      } else {
        alert('Error creating vacancy: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating vacancy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment/vacancies">
            <button className="btn-secondary p-2">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">Create New Vacancy</h2>
            <p className="page-description">Post a new job opening</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Job Details</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Emergency Physician"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  required
                  value={formData.department_id}
                  onChange={(e) => {
                    const dept = departments.find(d => d.id === e.target.value);
                    setFormData({
                      ...formData,
                      department_id: e.target.value,
                      department: dept?.name || ''
                    });
                  }}
                  className="tibbna-input"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Openings *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.openings}
                  onChange={(e) => setFormData({...formData, openings: parseInt(e.target.value)})}
                  className="tibbna-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., G6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recruiter
                </label>
                <input
                  type="text"
                  value={formData.recruiter}
                  onChange={(e) => setFormData({...formData, recruiter: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Nadia Al-Khatib"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Timeline</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posting Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.posting_date}
                  onChange={(e) => setFormData({...formData, posting_date: e.target.value})}
                  className="tibbna-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  className="tibbna-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Salary & Compensation</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary (IQD) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.salary_min}
                  onChange={(e) => setFormData({...formData, salary_min: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., 2200000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Salary (IQD) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.salary_max}
                  onChange={(e) => setFormData({...formData, salary_max: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., 2800000"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Job Description</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="tibbna-input"
                rows={4}
                placeholder="Describe the role and responsibilities..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requirements
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                className="tibbna-input"
                rows={4}
                placeholder="List the required qualifications and experience..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Vacancy'}
          </button>
          <Link href="/hr/recruitment/vacancies">
            <button type="button" className="btn-secondary">Cancel</button>
          </Link>
        </div>
      </form>
    </>
  );
}
