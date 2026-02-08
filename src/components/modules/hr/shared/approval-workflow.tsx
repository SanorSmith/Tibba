'use client';

import { Check, X, Clock, Circle } from 'lucide-react';

export interface ApprovalStep {
  label: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
  approver?: string;
  date?: string;
}

interface ApprovalWorkflowProps {
  steps: ApprovalStep[];
}

const stepConfig: Record<string, { bg: string; text: string; icon: typeof Check }> = {
  APPROVED: { bg: '#D1FAE5', text: '#065F46', icon: Check },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B', icon: X },
  PENDING: { bg: '#FEF3C7', text: '#92400E', icon: Clock },
  NOT_STARTED: { bg: '#F3F4F6', text: '#9CA3AF', icon: Circle },
};

export function ApprovalWorkflow({ steps }: ApprovalWorkflowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const config = stepConfig[step.status] || stepConfig.NOT_STARTED;
        const Icon = config.icon;
        return (
          <div key={index} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: config.bg }}
              >
                <Icon size={18} style={{ color: config.text }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#525252' }}>{step.label}</span>
              {step.approver && (
                <span style={{ fontSize: '10px', color: '#a3a3a3' }}>{step.approver}</span>
              )}
              {step.date && (
                <span style={{ fontSize: '10px', color: '#a3a3a3' }}>{step.date}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className="h-0.5 w-8 flex-shrink-0"
                style={{
                  backgroundColor: step.status === 'APPROVED' ? '#6EE7B7' : '#D1D5DB',
                  marginBottom: step.approver ? '24px' : '12px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
