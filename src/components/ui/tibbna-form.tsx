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
    <div className="w-full">
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="text-xs mt-1" style={{ color: '#525252' }}>{helper}</p>
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>
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
    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-6" style={{ borderTop: '1px solid #e4e4e4' }}>
      {children}
    </div>
  );
}
