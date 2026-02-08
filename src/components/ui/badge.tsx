import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#F3F4F6] text-[#374151]',
        secondary: 'border-transparent bg-[#F3F4F6] text-[#374151]',
        success: 'border-transparent bg-[#D1FAE5] text-[#065F46]',
        warning: 'border-transparent bg-[#FEF3C7] text-[#92400E]',
        error: 'border-transparent bg-[#FEE2E2] text-[#991B1B]',
        info: 'border-transparent bg-[#DBEAFE] text-[#1E40AF]',
        outline: 'border-[#e4e4e4] text-black',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
