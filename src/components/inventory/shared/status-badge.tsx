'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = (): "default" | "secondary" | "success" | "error" | "warning" | "info" => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'active' || statusLower === 'approved' || statusLower === 'completed' || statusLower === 'received') {
      return 'success';
    }
    if (statusLower === 'pending' || statusLower === 'submitted' || statusLower === 'draft') {
      return 'warning';
    }
    if (statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'expired' || statusLower === 'recalled') {
      return 'error';
    }
    if (statusLower === 'partial' || statusLower === 'sent') {
      return 'info';
    }
    return 'default';
  };

  return (
    <Badge variant={getVariant()} className={cn("text-xs", className)}>
      {status.toUpperCase()}
    </Badge>
  );
}
