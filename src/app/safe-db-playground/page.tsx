'use client';

import { useState } from 'react';

export default function SafeDBPlayground() {
  const [operation, setOperation] = useState('SELECT');
  const [table, setTable] = useState('patients');
  const [columns, setColumns] = useState('*');
  const [where, setWhere] = useState('');
  const [limit, setLimit] = useState('10');
  const [data, setData] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tables = [
    'users', 'workspaces', 'patients', 'appointments', 
    'staff', 'departments', 'lab', 'pharmacy', 'operations', 'todo'
  ];

  const executeOperation = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let response;
      
      if (operation === 'SELECT') {
        const params = new URLSearchParams({
          table,
          columns,
          ...(where && { where }),
          ...(limit && { limit })
        });
        response = await fetch(`/api/safe-teammate-db?${params}`);
      } else {
        // INSERT, UPDATE, DELETE
        let payload: any = { operation, table };
        
        if (operation === 'INSERT') {
          payload.data = JSON.parse(data);
        } else if (operation === 'UPDATE') {
          payload.data = JSON.parse(data);
          payload.where = where;
        } else if (operation === 'DELETE') {
          payload.where = where;
        }
        
        response = await fetch('/api/safe-teammate-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();
      
      if (result.success) {
        setResult(result);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSampleData = () => {
    switch (table) {
      case 'patients':
        return '{"firstname": "John", "lastname": "Doe", "email": "john@example.com"}';
      case 'appointments':
        return '{"patientname": "John Doe", "notes": {"comments": []}}';
      case 'staff':
        return '{"firstname": "Jane", "lastname": "Smith", "role": "nurse", "unit": "Emergency"}';
      default:
        return '{"name": "Example"}';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔒 Safe Database Playground</h1>
        <p className="text-gray-600">
          Modify data safely without changing database structure
        </p>
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            ✅ SAFE: INSERT, UPDATE, DELETE, SELECT operations only
          </p>
          <p className="text-sm text-green-800">
            🚫 BLOCKED: ALTER, DROP, CREATE, TRUNCATE schema operations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Operation Controls</h2>
          
          <div className="space-y-4">
            {/* Operation Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Operation</label>
              <select 
                value={operation} 
                onChange={(e) => setOperation(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="SELECT">SELECT (Read)</option>
                <option value="INSERT">INSERT (Create)</option>
                <option value="UPDATE">UPDATE (Modify)</option>
                <option value="DELETE">DELETE (Remove)</option>
              </select>
            </div>

            {/* Table */}
            <div>
              <label className="block text-sm font-medium mb-1">Table</label>
              <select 
                value={table} 
                onChange={(e) => setTable(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {tables.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Columns (for SELECT) */}
            {operation === 'SELECT' && (
              <div>
                <label className="block text-sm font-medium mb-1">Columns</label>
                <input 
                  type="text" 
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="* or column1, column2"
                />
              </div>
            )}

            {/* WHERE clause */}
            {(operation === 'SELECT' || operation === 'UPDATE' || operation === 'DELETE') && (
              <div>
                <label className="block text-sm font-medium mb-1">WHERE Clause</label>
                <input 
                  type="text" 
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="id = 1 OR name LIKE '%test%'"
                />
              </div>
            )}

            {/* LIMIT (for SELECT) */}
            {operation === 'SELECT' && (
              <div>
                <label className="block text-sm font-medium mb-1">Limit</label>
                <input 
                  type="number" 
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="10"
                />
              </div>
            )}

            {/* Data (for INSERT/UPDATE) */}
            {(operation === 'INSERT' || operation === 'UPDATE') && (
              <div>
                <label className="block text-sm font-medium mb-1">Data (JSON)</label>
                <textarea 
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full p-2 border rounded h-24"
                  placeholder={getSampleData()}
                />
                <button 
                  onClick={() => setData(getSampleData())}
                  className="mt-1 text-sm text-blue-600 hover:underline"
                >
                  Use Sample Data
                </button>
              </div>
            )}

            {/* Execute Button */}
            <button 
              onClick={executeOperation}
              disabled={loading}
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Executing...' : `Execute ${operation}`}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium">
                  ✅ {result.operation} on {result.table} successful
                </p>
                <p className="text-green-600 text-sm">
                  Records affected: {result.count || 'N/A'}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Data Preview:</h3>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="text-center text-gray-500 py-8">
              <p>Execute an operation to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
