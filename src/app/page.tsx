import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Uncomment the line below to redirect to login as normal
  // redirect('/login');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tibbna Hospital</h1>
        <p className="text-gray-600 mb-6">Hospital Management System</p>
        
        <div className="space-y-3">
          <Link 
            href="/login"
            className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700"
          >
            Go to Login
          </Link>
          
          <Link 
            href="/dashboard-temp"
            className="block w-full bg-gray-600 text-white text-center py-2 px-4 rounded hover:bg-gray-700"
          >
            Database Dashboard (Temporary)
          </Link>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Database Dashboard:</strong> View all tables and data from your Supabase database.
          </p>
        </div>
      </div>
    </div>
  );
}
