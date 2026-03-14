'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, UserPlus, Mail, Phone, Briefcase, GraduationCap, Calendar, DollarSign, FileText, Upload } from 'lucide-react';

export default function CreateApplicantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    nationality: '',
    education: '',
    university: '',
    specialization: '',
    experience_years: '',
    current_employer: '',
    expected_salary: '',
    source: '',
    referral_employee: '',
    vacancy_id: '',
    resume_url: '',
    notes: ''
  });

  const vacancies = [
    { id: 'd4781355-1013-4f6b-bc14-dac93d345289', position: 'Emergency Physician', department: 'Emergency Department' },
    { id: 'e6d7dbb4-a4c7-40bf-854a-d50fde16a240', position: 'Staff Nurse - ICU', department: 'Intensive Care Unit' },
    { id: 'f72ca09a-ff4c-4c25-8f72-3e7ad81780ea', position: 'Lab Technician', department: 'Laboratory' }
  ];

  const educationLevels = [
    'HIGH SCHOOL',
    'BACHELOR',
    'MASTER',
    'PHD',
    'DIPLOMA',
    'CERTIFICATE'
  ];

  const sources = [
    'WEBSITE',
    'LINKEDIN',
    'REFERRAL',
    'JOB BOARD',
    'WALK_IN',
    'SOCIAL_MEDIA',
    'OTHER'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate candidate number
      const candidateNumber = `CAND-${new Date().getFullYear()}-00${Math.floor(Math.random() * 1000)}`;

      const response = await fetch('/api/hr/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/hr/recruitment/candidates/${result.data.id}`);
      } else {
        alert('Error creating applicant: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating applicant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment/applicants">
            <button className="btn-secondary p-2">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">Add New Applicant</h2>
            <p className="page-description">Register a new job applicant</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Personal Information</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Mohammed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Al-Saadi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., mohammed.saadi@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., +964-770-200-0001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Iraqi"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Education & Experience</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Level
                </label>
                <select
                  value={formData.education}
                  onChange={(e) => setFormData({...formData, education: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Education</option>
                  {educationLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  University
                </label>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., University of Baghdad"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Emergency Medicine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience Years
                </label>
                <input
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Employer
                </label>
                <input
                  type="text"
                  value={formData.current_employer}
                  onChange={(e) => setFormData({...formData, current_employer: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., Baghdad Teaching Hospital"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Salary (IQD)
                </label>
                <input
                  type="number"
                  value={formData.expected_salary}
                  onChange={(e) => setFormData({...formData, expected_salary: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., 2500000"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title">Application Details</h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applied Position *
                </label>
                <select
                  required
                  value={formData.vacancy_id}
                  onChange={(e) => setFormData({...formData, vacancy_id: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Position</option>
                  {vacancies.map(vacancy => (
                    <option key={vacancy.id} value={vacancy.id}>
                      {vacancy.position} - {vacancy.department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  className="tibbna-input"
                >
                  <option value="">Select Source</option>
                  {sources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Employee
                </label>
                <input
                  type="text"
                  value={formData.referral_employee}
                  onChange={(e) => setFormData({...formData, referral_employee: e.target.value})}
                  className="tibbna-input"
                  placeholder="e.g., EMP-2024-048"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resume URL
                </label>
                <input
                  type="url"
                  value={formData.resume_url}
                  onChange={(e) => setFormData({...formData, resume_url: e.target.value})}
                  className="tibbna-input"
                  placeholder="https://example.com/resume.pdf"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="tibbna-input"
                rows={4}
                placeholder="Additional notes about the applicant..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Applicant'}
          </button>
          <Link href="/hr/recruitment/applicants">
            <button type="button" className="btn-secondary">Cancel</button>
          </Link>
        </div>
      </form>
    </>
  );
}
