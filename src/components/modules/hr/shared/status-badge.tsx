'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variantStyles: Record<string, { bg: string; text: string }> = {
  default: { bg: '#F3F4F6', text: '#374151' },
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1D4ED8' },
};

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const style = variantStyles[variant] || variantStyles.default;
  return (
    <span
      className="tibbna-badge"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}

const autoVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  COMPLETED: 'success',
  PRESENT: 'success',
  PAID: 'success',
  PAID_OFF: 'success',
  HIRED: 'success',
  ATTENDED: 'success',
  FINALIZED: 'success',
  FILLED: 'success',
  JUSTIFIED: 'success',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  IN_PROGRESS: 'warning',
  SCHEDULED: 'warning',
  PROCESSING: 'warning',
  SUBMITTED: 'warning',
  OPEN: 'warning',
  SCREENING: 'warning',
  INTERVIEWING: 'warning',
  LATE: 'warning',
  OFFERED: 'warning',
  DRAFT: 'warning',
  ON_LEAVE: 'warning',
  EXPIRING_SOON: 'warning',
  REGISTERED: 'info',
  NEW: 'info',
  NOT_STARTED: 'info',
  CALCULATED: 'info',
  HALF_DAY: 'info',
  PLANNING: 'info',
  REJECTED: 'error',
  CANCELLED: 'error',
  ABSENT: 'error',
  TERMINATED: 'error',
  SUSPENDED: 'error',
  FAILED: 'error',
  EXPIRED: 'error',
  WARNING_ISSUED: 'error',
  CLOSED: 'error',
  UNAUTHORIZED_ABSENCE: 'error',
};

export function SmartStatusBadge({ status }: { status: string }) {
  const variant = autoVariantMap[status.toUpperCase()] || 'default';
  return <StatusBadge status={status.replace(/_/g, ' ')} variant={variant} />;
}
