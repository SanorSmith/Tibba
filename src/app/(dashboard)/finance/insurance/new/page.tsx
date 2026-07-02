'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InsuranceNewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/finance/insurance');
  }, [router]);
  return null;
}
