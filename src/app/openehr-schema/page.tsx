'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function OpenEHRSchemaPage() {
  const [loading, setLoading] = useState(false);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);

  const loadSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/openehr-schema');
      const data = await response.json();

      if (response.ok) {
        setSchemaData(data);
        toast.success(`✅ Found ${data.total_tables} tables in OpenEHR database`);
      } else {
        setSchemaData({ error: data.error });
        toast.error(`❌ Failed to load schema: ${data.error}`);
      }
    } catch (error: any) {
      setSchemaData({ error: error.message });
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectTable = (table: any) => {
    setSelectedTable(table);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading OpenEHR database schema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OpenEHR Database Schema</h1>
        <p className="text-gray-500 text-sm">Explore the structure of the OpenEHR (TEAMMATE) database</p>
      </div>

      {!schemaData && (
        <div className="bg-white rounded-lg border p-6 text-center">
          <button
            onClick={loadSchema}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-medium"
          >
            Load Database Schema
          </button>
          <p className="mt-4 text-sm text-gray-500">
            This will connect to the OpenEHR database and retrieve all table structures
          </p>
        </div>
      )}

      {schemaData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-2">❌ Error Loading Schema</h3>
          <p className="text-red-700 text-sm">{schemaData.error}</p>
          <button
            onClick={loadSchema}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {schemaData?.success && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Database Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Database:</span>
                <span className="ml-2 font-medium">{schemaData.database}</span>
              </div>
              <div>
                <span className="text-gray-700">Total Tables:</span>
                <span className="ml-2 font-medium">{schemaData.total_tables}</span>
              </div>
              <div>
                <span className="text-gray-700">Sample Data:</span>
                <span className="ml-2 font-medium text-green-600">Available</span>
              </div>
              <div>
                <span className="text-blue-700">Status:</span>
                <span className="ml-2 font-medium text-green-600">Connected</span>
              </div>
            </div>
          </div>

          {/* Tables List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tables List */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Tables ({schemaData.tables.length})</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {schemaData.tables.map((table: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => selectTable(table)}
                    className="p-3 border-b hover:bg-gray-50 cursor-pointer last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{table.name}</div>
                        <div className="text-xs text-gray-500">{table.schema}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-gray-400">{table.columns.length} columns</div>
                        <div className={`font-medium ${table.record_count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {table.record_count} records
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Details */}
            {selectedTable && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-lg">{selectedTable.name}</h3>
                  <p className="text-sm text-gray-500">{selectedTable.schema}.{selectedTable.name}</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Primary Key */}
                  {selectedTable.primary_key.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-blue-900 mb-2">Primary Key</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTable.primary_key.map((pk: string, idx: number) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {pk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Foreign Keys */}
                  {selectedTable.foreign_keys.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-green-900 mb-2">Foreign Keys</h4>
                      <div className="space-y-2">
                        {selectedTable.foreign_keys.map((fk: any, idx: number) => (
                          <div key={idx} className="bg-green-50 p-2 rounded text-xs">
                            <div className="font-medium">{fk.column_name}</div>
                            <div className="text-gray-600">
                              → {fk.foreign_table_name}.{fk.foreign_column_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Records */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-2">
                      Sample Records ({selectedTable.record_count} of 5)
                    </h4>
                    {selectedTable.record_count > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              {selectedTable.columns.map((column: any, idx: number) => (
                                <th key={idx} className="text-left p-2 font-medium">
                                  {column.column_name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTable.sample_records.map((record: any, recordIdx: number) => (
                              <tr key={recordIdx} className="border-b">
                                {selectedTable.columns.map((column: any, colIdx: number) => (
                                  <td key={colIdx} className="p-2">
                                    <div className="max-w-xs truncate">
                                      {record[column.column_name] !== null && record[column.column_name] !== undefined 
                                        ? String(record[column.column_name])
                                        : '<null>'
                                      }
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No sample records available for this table
                      </div>
                    )}
                  </div>

                  {/* Columns */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Columns ({selectedTable.columns.length})</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-2">Column</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Nullable</th>
                            <th className="text-left p-2">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTable.columns.map((column: any, idx: number) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2 font-medium">{column.column_name}</td>
                              <td className="p-2">
                                <span className="bg-gray-100 px-2 py-0.5 rounded">
                                  {column.data_type}
                                  {column.character_maximum_length && `(${column.character_maximum_length})`}
                                  {column.numeric_precision && column.numeric_scale && `(${column.numeric_precision},${column.numeric_scale})`}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  column.is_nullable === 'YES' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {column.is_nullable}
                                </span>
                              </td>
                              <td className="p-2 text-gray-600">
                                {column.column_default || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
