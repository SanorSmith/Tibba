'use client';

import { cn } from '@/lib/utils';

interface StockLevelIndicatorProps {
  current: number;
  reorder: number;
  minimum: number;
  className?: string;
}

export function StockLevelIndicator({ current, reorder, minimum, className }: StockLevelIndicatorProps) {
  const getStatus = () => {
    if (current === 0) return { color: 'red', label: 'OUT OF STOCK', bgColor: 'bg-red-500', textColor: 'text-red-600' };
    if (current < minimum) return { color: 'red', label: 'CRITICAL', bgColor: 'bg-red-500', textColor: 'text-red-600' };
    if (current < reorder) return { color: 'orange', label: 'LOW', bgColor: 'bg-orange-500', textColor: 'text-orange-600' };
    return { color: 'green', label: 'GOOD', bgColor: 'bg-green-500', textColor: 'text-green-600' };
  };

  const status = getStatus();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-3 h-3 rounded-full", status.bgColor)} />
      <span className={cn("text-sm font-medium", status.textColor)}>
        {status.label}
      </span>
    </div>
  );
}
