'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Plus, Users, GripVertical, ChevronRight } from 'lucide-react';
import Link from 'next/link';


const stageColors: Record<string, string> = {
  APPLICATION: '#3B82F6',
  SCREENING: '#8B5CF6',
  ASSESSMENT: '#F59E0B',
  INTERVIEW: '#EF4444',
  OFFER: '#10B981',
  HIRED: '#065F46',
  REJECTED: '#991B1B',
  DEFAULT: '#6B7280',
};

interface PipelineStage {
  stage_id: string;
  stage_name: string;
  stage_type: string;
  stage_order: number;
  applications: any[];
}

export default function PipelinePage() {
  const router = useRouter();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      // Fetch pipeline summary (stages with counts)
      const summaryRes = await fetch(`/api/recruitment/pipeline/summary`);
      const summaryData = await summaryRes.json();

      // Fetch all applications
      const appsRes = await fetch(`/api/recruitment/applications`);
      const appsData = await appsRes.json();

      if (summaryData.success && appsData.success) {
        setSummary(summaryData);
        const allApps = appsData.data || [];
        const stageList = (summaryData.pipeline || []).map((s: any) => ({
          stage_id: s.stageId,
          stage_name: s.stageName,
          stage_type: s.stageType,
          stage_order: s.stageOrder,
          applications: allApps.filter((a: any) => a.current_stage_id === s.stageId),
        }));
        setStages(stageList);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('applicationId', appId);
    setDragging(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('applicationId');
    setDragging(null);

    // Find source stage
    const sourceStage = stages.find(s => s.applications.some(a => a.application_id === appId));
    if (!sourceStage || sourceStage.stage_id === targetStageId) return;

    // Optimistic update
    setStages(prev => {
      const next = prev.map(s => ({
        ...s,
        applications: s.stage_id === sourceStage.stage_id
          ? s.applications.filter(a => a.application_id !== appId)
          : s.stage_id === targetStageId
            ? [...s.applications, sourceStage.applications.find(a => a.application_id === appId)!]
            : [...s.applications],
      }));
      return next;
    });

    try {
      const res = await fetch(`/api/recruitment/applications/${appId}/move-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStageId: targetStageId }),
      });
      const data = await res.json();
      if (data.success) toast.success('Candidate moved');
      else { toast.error(data.error); fetchPipeline(); }
    } catch { toast.error('Failed to move'); fetchPipeline(); }
  };

  const filteredStages = stages.map(s => ({
    ...s,
    applications: search
      ? s.applications.filter(a =>
          a.candidate_first_name?.toLowerCase().includes(search.toLowerCase()) ||
          a.candidate_last_name?.toLowerCase().includes(search.toLowerCase()) ||
          a.vacancy_position?.toLowerCase().includes(search.toLowerCase())
        )
      : s.applications,
  }));

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Recruitment Pipeline</h2>
          <p className="page-description">Track candidates through hiring stages - drag & drop to move</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/recruitment">
            <button className="btn-secondary flex items-center gap-2"><Users size={16} /> Recruitment</button>
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {summary?.statusSummary && (
        <div className="tibbna-section flex flex-wrap gap-3">
          {summary.statusSummary.map((s: any) => (
            <div key={s.status} className="tibbna-badge" style={{ fontSize: '12px', padding: '4px 10px' }}>
              {s.status}: <strong>{s.count}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="tibbna-section" style={{ maxWidth: 400 }}>
        <div className="relative">
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
          <input type="text" placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="tibbna-input" style={{ paddingLeft: 36, width: '100%' }} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading pipeline...</div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, minWidth: stages.length * 290 }}>
            {filteredStages.map((stage) => {
              const color = stageColors[stage.stage_type] || stageColors.DEFAULT;
              return (
                <div
                  key={stage.stage_id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.stage_id)}
                  style={{ width: 280, flexShrink: 0 }}
                >
                  {/* Stage Header */}
                  <div style={{
                    backgroundColor: color, color: '#fff', padding: '10px 14px',
                    borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{stage.stage_name}</span>
                    <span style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 99 }}>
                      {stage.applications.length}
                    </span>
                  </div>

                  {/* Stage Body */}
                  <div style={{
                    backgroundColor: '#FAFAFA', border: '1px solid #e4e4e4', borderTop: 'none',
                    borderRadius: '0 0 8px 8px', minHeight: 120, padding: 8, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    {stage.applications.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center', padding: 24 }}>No candidates</p>
                    )}
                    {stage.applications.map((app) => (
                      <div
                        key={app.application_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.application_id)}
                        onClick={() => router.push(`/hr/recruitment/applications/${app.application_id}`)}
                        style={{
                          backgroundColor: '#fff', border: '1px solid #e4e4e4', borderRadius: 6,
                          padding: '10px 12px', cursor: 'grab',
                          opacity: dragging === app.application_id ? 0.5 : 1,
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <GripVertical size={14} style={{ color: '#d4d4d4', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {app.candidate_first_name} {app.candidate_last_name}
                            </p>
                            <p style={{ fontSize: '11px', color: '#a3a3a3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {app.vacancy_position || '-'}
                            </p>
                          </div>
                          <ChevronRight size={14} style={{ color: '#d4d4d4', flexShrink: 0 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span className="tibbna-badge" style={{ fontSize: '9px', padding: '1px 6px' }}>{app.status}</span>
                          <span style={{ fontSize: '10px', color: '#a3a3a3' }}>
                            {app.created_at ? new Date(app.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
