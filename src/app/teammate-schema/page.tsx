'use client';

import { useState, useEffect } from 'react';

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface TableSchema {
  tableName: string;
  tableType: string;
  rowCount: number;
  columns: Column[];
  sampleData: any[];
}

interface SchemaResponse {
  success: boolean;
  database: string;
  totalTables: number;
  schema: TableSchema[];
}

export default function TeammateSchema() {
  const [schemaData, setSchemaData] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const fetchSchema = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/teammate-schema');
      const result: SchemaResponse = await response.json();
      
      if (result.success) {
        setSchemaData(result);
      } else {
        throw new Error(result.error || 'Failed to fetch schema');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Analyzing Database Schema...</h1>
        <div className="animate-pulse">Fetching structure from teammate's database...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Schema Analysis Error</h1>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={fetchSchema}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!schemaData) {
    return null;
  }

  const selectedTableData = schemaData.schema.find(table => table.tableName === selectedTable);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Teammate Database Schema</h1>
        <p className="text-gray-600">
          Database: {schemaData.database} | Total Tables: {schemaData.totalTables}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Tables</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {schemaData.schema.map((table) => (
                <div
                  key={table.tableName}
                  onClick={() => setSelectedTable(table.tableName)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedTable === table.tableName ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{table.tableName}</p>
                      <p className="text-sm text-gray-500">{table.tableType}</p>
                    </div>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {table.rowCount} rows
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Details */}
        <div className="lg:col-span-2">
          {selectedTableData ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">{selectedTableData.tableName}</h2>
                <p className="text-sm text-gray-600">
                  {selectedTableData.tableType} • {selectedTableData.rowCount} rows
                </p>
              </div>

              {/* Columns */}
              <div className="p-4">
                <h3 className="font-medium mb-3">Columns</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Column</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Nullable</th>
                        <th className="text-left p-2">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTableData.columns.map((column, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{column.column_name}</td>
                          <td className="p-2 text-gray-600">{column.data_type}</td>
                          <td className="p-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              column.is_nullable === 'YES' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {column.is_nullable}
                            </span>
                          </td>
                          <td className="p-2 text-gray-500 text-xs">
                            {column.column_default || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Data */}
              {selectedTableData.sampleData.length > 0 && (
                <div className="p-4 border-t">
                  <h3 className="font-medium mb-3">Sample Data (First 3 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {selectedTableData.columns.map((column, index) => (
                            <th key={index} className="text-left p-2">
                              {column.column_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTableData.sampleData.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b">
                            {selectedTableData.columns.map((column, colIndex) => (
                              <td key={colIndex} className="p-2 text-gray-600">
                                {row[column.column_name] !== null 
                                  ? String(row[column.column_name]) 
                                  : 'NULL'}
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
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Select a table to view its schema</p>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={fetchSchema}
        className="mt-6 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Refresh Schema
      </button>
    </div>
  );
}
