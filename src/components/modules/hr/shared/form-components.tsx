'use client';

import { ReactNode } from 'react';

interface FormGroupProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  helper?: string;
}

export function FormGroup({ label, children, required, error, helper }: FormGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
        {label}
        {required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {helper && !error && (
        <span style={{ fontSize: '11px', color: '#a3a3a3' }}>{helper}</span>
      )}
      {error && (
        <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>
      )}
    </div>
  );
}

export function FormRow({ children, columns = 1 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const gridClass = {
    1: 'grid grid-cols-1 gap-4',
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  }[columns];

  return <div className={gridClass}>{children}</div>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4" style={{ borderTop: '1px solid #e4e4e4' }}>
      {children}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', paddingBottom: '8px', borderBottom: '1px solid #e4e4e4' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
