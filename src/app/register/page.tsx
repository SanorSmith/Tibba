'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    // Open the old admin panel register in a new window
    const oldAdminUrl = 'http://localhost:3000/register'; // Adjust this URL to your old admin panel
    window.open(oldAdminUrl, '_blank', 'width=1200,height=800');
    
    // Redirect back to dashboard after opening
    window.location.href = '/dashboard';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Opening Register...</h1>
        <p className="text-gray-600">Opening old admin panel register in a new window.</p>
        <p className="text-sm text-gray-500 mt-2">You will be redirected to dashboard shortly.</p>
      </div>
    </div>
  );
}
