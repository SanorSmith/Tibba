'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewFormProps {
  employeeId?: string;
  employeeName?: string;
  reviewId?: string;
  reviewData?: any; // Pass existing review data to avoid API call
  onClose: () => void;
  onSave: () => void;
}

export default function ReviewFormModal({ employeeId, employeeName, reviewId, reviewData, onClose, onSave }: ReviewFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const [formData, setFormData] = useState({
    cycle_id: 'PC-2025',
    cycle_name: 'Annual Review 2025',
    clinical_competence: 0,
    patient_care: 0,
    professionalism: 0,
    teamwork: 0,
    quality_safety: 0,
    strengths: '',
    improvements: '',
    achievements: '',
    goals_next_period: '',
    recommendation: 'Standard Increase',
    status: 'IN_PROGRESS'
  });

  const [comprehensiveScore, setComprehensiveScore] = useState<any>(null);

  useEffect(() => {
    // Load employees for selection
    loadEmployees();
    if (reviewId && reviewData) {
      // Use existing review data instead of API call
      setFormData({
        cycle_id: reviewData.cycle_id || 'PC-2025',
        cycle_name: reviewData.cycle_name || 'Annual Review 2025',
        clinical_competence: reviewData.clinical_competence || 0,
        patient_care: reviewData.patient_care || 0,
        professionalism: reviewData.professionalism || 0,
        teamwork: reviewData.teamwork || 0,
        quality_safety: reviewData.quality_safety || 0,
        strengths: reviewData.strengths || '',
        improvements: reviewData.improvements || '',
        achievements: reviewData.achievements || '',
        goals_next_period: reviewData.goals_next_period || '',
        recommendation: reviewData.recommendation || 'Standard Increase',
        status: reviewData.status || 'IN_PROGRESS'
      });
    } else if (reviewId) {
      // Fallback to API call if no review data provided
      loadReview();
    }
  }, [reviewId, reviewData]);

  useEffect(() => {
    // Calculate comprehensive score when competency ratings change
    if (formData.clinical_competence > 0 && selectedEmployeeId) {
      fetchComprehensiveScore();
    }
  }, [formData.clinical_competence, formData.patient_care, formData.professionalism, formData.teamwork, formData.quality_safety, selectedEmployeeId]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      console.log('Staff API Response:', data);
      if (data.success && data.staff) {
        setEmployees(data.staff);
      } else {
        console.error('Staff API error:', data.error);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadReview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hr/performance/reviews/${reviewId}`);
      const data = await response.json();
      if (data.success) {
        setFormData({
          cycle_id: data.data.cycle_id || 'PC-2025',
          cycle_name: data.data.cycle_name || 'Annual Review 2025',
          clinical_competence: data.data.clinical_competence || 0,
          patient_care: data.data.patient_care || 0,
          professionalism: data.data.professionalism || 0,
          teamwork: data.data.teamwork || 0,
          quality_safety: data.data.quality_safety || 0,
          strengths: data.data.strengths || '',
          improvements: data.data.improvements || '',
          achievements: data.data.achievements || '',
          goals_next_period: data.data.goals_next_period || '',
          recommendation: data.data.recommendation || 'Standard Increase',
          status: data.data.status || 'IN_PROGRESS'
        });
      } else {
        // API failed, try to load from the list of reviews in the parent component
        console.log('API failed, trying to load from parent component data');
        // This is a temporary workaround until the API is fixed
        toast.error('API temporarily unavailable - please restart server');
      }
    } catch (error) {
      console.error('Error loading review:', error);
      toast.error('Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const fetchComprehensiveScore = async () => {
    try {
      const response = await fetch('/api/hr/performance/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedEmployeeId })
      });
      const data = await response.json();
      if (data.success) {
        setComprehensiveScore(data.data);
      }
    } catch (error) {
      console.error('Error fetching comprehensive score:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    
    setSaving(true);
    try {
      // Use the list API for both create and update operations
      const response = await fetch('/api/hr/performance/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          review_id: reviewId || undefined, // Include reviewId for updates
          ...formData,
          review_period_start: '2025-01-01',
          review_period_end: '2025-12-31'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(reviewId ? 'Review updated successfully' : 'Review created successfully');
        onSave();
        onClose();
      } else {
        toast.error(data.error || 'Failed to save review');
      }
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const calculateOverallRating = () => {
    const ratings = [
      formData.clinical_competence,
      formData.patient_care,
      formData.professionalism,
      formData.teamwork,
      formData.quality_safety
    ].filter(r => r > 0);
    
    if (ratings.length === 0) return '0.0';
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#10B981';
    if (rating >= 4.0) return '#3B82F6';
    if (rating >= 3.0) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      </div>
    );
  }

  const overallRating = parseFloat(calculateOverallRating());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {reviewId ? 'Edit' : 'New'} Performance Review
            </h2>
            <p className="text-sm text-gray-600">
              {selectedEmployeeId ? (() => {
                const employee = employees.find(e => e.id === selectedEmployeeId);
                return employee ? `${employee.firstName} ${employee.lastName}` : 'Select Employee';
              })() : 'Select Employee'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee Selection */}
          {!reviewId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee *</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  // Reset comprehensive score when employee changes
                  setComprehensiveScore(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Choose an employee...</option>
                {employees
                  .map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.role}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Show warning if no employee selected */}
          {!selectedEmployeeId && !reviewId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Please select an employee to continue with the performance review.
              </p>
            </div>
          )}

          {/* Competency Ratings */}
          <div className={`space-y-4 ${!selectedEmployeeId ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-lg font-semibold text-gray-900">Competency Ratings</h3>
            
            {[
              { key: 'clinical_competence', label: 'Clinical Competence', desc: 'Medical knowledge, diagnostic skills, procedures' },
              { key: 'patient_care', label: 'Patient Care', desc: 'Bedside manner, communication, empathy' },
              { key: 'professionalism', label: 'Professionalism', desc: 'Ethics, reliability, accountability' },
              { key: 'teamwork', label: 'Teamwork', desc: 'Collaboration, communication, support' },
              { key: 'quality_safety', label: 'Quality & Safety', desc: 'Protocols, documentation, safety practices' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{label}</label>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={formData[key as keyof typeof formData] as number || 0}
                      onChange={(e) => setFormData({ ...formData, [key]: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
                      disabled={!selectedEmployeeId}
                    />
                    <span className="text-sm text-gray-600">/ 5.0</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      width: `${((formData[key as keyof typeof formData] as number) / 5) * 100}%`,
                      backgroundColor: getRatingColor(formData[key as keyof typeof formData] as number)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Overall Rating Display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Competency Overall Rating</p>
                <p className="text-xs text-gray-500">Average of all competency scores</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: getRatingColor(overallRating) }}>
                  {overallRating.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">out of 5.0</p>
              </div>
            </div>
          </div>

          {/* Comprehensive Score */}
          {comprehensiveScore && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Comprehensive Performance Score</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-700">Overall Score</p>
                  <p className="text-2xl font-bold text-blue-900">{comprehensiveScore.overall_score}/5.0</p>
                  <p className="text-xs text-blue-600">{comprehensiveScore.rating}</p>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Competency (40%):</span>
                    <span className="font-semibold">{comprehensiveScore.breakdown.competency.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Attendance (30%):</span>
                    <span className="font-semibold">{comprehensiveScore.breakdown.attendance.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Patient Feedback (20%):</span>
                    <span className="font-semibold">{comprehensiveScore.breakdown.patient_feedback.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Recognition (10%):</span>
                    <span className="font-semibold">{comprehensiveScore.breakdown.recognition.contribution}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text Fields */}
          <div className={`space-y-4 ${!selectedEmployeeId ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Strengths</label>
              <textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="What does this employee do well?"
                disabled={!selectedEmployeeId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Areas for Improvement</label>
              <textarea
                value={formData.improvements}
                onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="What could be improved?"
                disabled={!selectedEmployeeId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Achievements</label>
              <textarea
                value={formData.achievements}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Notable accomplishments this period"
                disabled={!selectedEmployeeId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goals for Next Period</label>
              <textarea
                value={formData.goals_next_period}
                onChange={(e) => setFormData({ ...formData, goals_next_period: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Goals and objectives for the next review period"
                disabled={!selectedEmployeeId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation</label>
              <select
                value={formData.recommendation}
                onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={!selectedEmployeeId}
              >
                <option value="Standard Increase">Standard Increase</option>
                <option value="Merit Increase">Merit Increase</option>
                <option value="Promotion">Promotion</option>
                <option value="No Increase">No Increase</option>
                <option value="Performance Improvement Plan">Performance Improvement Plan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={!selectedEmployeeId}
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="FINALIZED">Finalized</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedEmployeeId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
