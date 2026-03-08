'use client';

import { ReactNode } from 'react';

interface LeaveLayoutProps {
  children: ReactNode;
}

export default function LeaveLayout({ children }: LeaveLayoutProps) {
  return <>{children}</>;
}
