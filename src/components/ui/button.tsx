import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  // Tibbna: 6px radius, 14px font, 500 weight
  {
    variants: {
      variant: {
        default: 'bg-black text-white hover:opacity-90 rounded-[6px]',
        primary: 'bg-black text-white hover:opacity-90 rounded-[6px]',
        destructive: 'bg-[#EF4444] text-white hover:bg-[#DC2626] rounded-[6px]',
        outline: 'border border-[#e4e4e4] bg-white hover:bg-[#f5f5f5] text-black rounded-[6px]',
        secondary: 'bg-[#f5f5f5] text-black hover:bg-[#ebebeb] rounded-[6px]',
        ghost: 'hover:bg-[#f5f5f5] rounded-[6px]',
        link: 'text-black underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
