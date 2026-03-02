'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ldabymaexuvyeygjqbby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkYWJ5bWFleHV2eWV5Z2pxYmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjIxNDYsImV4cCI6MjA4NjQ5ODE0Nn0.9A84rHLK6H6lsPzGXf60MTs68TeAewP16iJJanXOQNM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
  sampleData: Record<string, any>[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

export default function DatabaseDashboard() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the API endpoint for better performance
      const response = await fetch('/api/dashboard-temp/tables');
      const data = await response.json();

      if (data.success) {
        setTables(data.tables);
      } else {
        setError(data.error || 'Failed to fetch tables');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const refreshTable = async (tableName: string) => {
    try {
      // Use the API to get fresh data
      const response = await fetch('/api/dashboard-temp/tables');
      const data = await response.json();

      if (data.success) {
        const updatedTable = data.tables.find((t: TableInfo) => t.name === tableName);
        if (updatedTable) {
          setTables(prev => prev.map(table => 
            table.name === tableName 
              ? { ...table, rowCount: updatedTable.rowCount, sampleData: updatedTable.sampleData }
              : table
          ));
        }
      }
    } catch (err) {
      console.error(`Error refreshing table ${tableName}:`, err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading database tables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Connection Error</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchTables}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Database Dashboard</h1>
              <p className="text-sm text-gray-500">Supabase: ldabymaexuvyeygjqbby.supabase.co</p>
            </div>
            <button
              onClick={fetchTables}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh All
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Tables Overview ({tables.length} tables)
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => toggleTableExpansion(table.name)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{table.name}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {table.rowCount} rows
                    </span>
                  </div>
                  
                  {table.columns.length > 0 && (
                    <div className="text-sm text-gray-500 mb-2">
                      {table.columns.length} columns
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshTable(table.name);
                      }}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                    >
                      Refresh
                    </button>
                    <span className="text-xs text-gray-400">
                      {expandedTables.has(table.name) ? '▼' : '▶'} Click to expand
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {expandedTables.size > 0 && (
          <div className="space-y-6">
            {Array.from(expandedTables).map(tableName => {
              const table = tables.find(t => t.name === tableName);
              if (!table) return null;

              return (
                <div key={tableName} className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {table.name} ({table.rowCount} rows)
                    </h3>
                  </div>
                  
                  {table.columns.length > 0 && (
                    <div className="px-6 py-4 border-b">
                      <h4 className="font-medium text-gray-900 mb-3">Columns</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {table.columns.map((column) => (
                          <div key={column.name} className="text-sm">
                            <span className="font-medium">{column.name}</span>
                            <span className="text-gray-500 ml-2">{column.type}</span>
                            {!column.nullable && <span className="text-red-500 ml-1">*</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {table.sampleData.length > 0 && (
                    <div className="px-6 py-4">
                      <h4 className="font-medium text-gray-900 mb-3">Sample Data (first 3 rows)</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(table.sampleData[0]).map(key => (
                                <th
                                  key={key}
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {table.sampleData.map((row, idx) => (
                              <tr key={idx}>
                                {Object.values(row).map((value, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                  >
                                    {value === null ? (
                                      <span className="text-gray-400 italic">NULL</span>
                                    ) : typeof value === 'object' ? (
                                      <span className="text-gray-600">
                                        {JSON.stringify(value)}
                                      </span>
                                    ) : (
                                      String(value)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
