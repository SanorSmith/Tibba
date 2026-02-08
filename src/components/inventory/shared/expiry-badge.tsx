'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ExpiryBadgeProps {
  expiryDate: string;
  className?: string;
}

export function ExpiryBadge({ expiryDate, className }: ExpiryBadgeProps) {
  const calculateDaysToExpiry = (expiry: string): number => {
    const expiryDateTime = new Date(expiry);
    const today = new Date();
    const diffTime = expiryDateTime.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysToExpiry = calculateDaysToExpiry(expiryDate);

  const getVariant = (): "default" | "secondary" | "success" | "error" | "warning" | "info" => {
    if (daysToExpiry < 0) return 'error';
    if (daysToExpiry < 15) return 'error';
    if (daysToExpiry < 30) return 'warning';
    if (daysToExpiry < 60) return 'info';
    return 'success';
  };

  const getLabel = (): string => {
    if (daysToExpiry < 0) return 'EXPIRED';
    return `${daysToExpiry} days`;
  };

  return (
    <Badge variant={getVariant()} className={cn("text-xs", className)}>
      {getLabel()}
    </Badge>
  );
}
