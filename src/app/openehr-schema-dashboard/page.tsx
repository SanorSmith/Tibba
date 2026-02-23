'use client';

import { useEffect, useState } from 'react';
import { Database, Table, Key, Link, Eye, Search, Download, RefreshCw } from 'lucide-react';

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface ForeignKey {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface TableDetail {
  schema: string;
  name: string;
  type: string;
  columns: Column[];
  primary_key: string[];
  foreign_keys: ForeignKey[];
  sample_records: any[];
  record_count: number;
}

interface SchemaData {
  success: boolean;
  database: string;
  total_tables: number;
  tables: TableDetail[];
  error?: string;
}

export default function OpenEHRSchemaDashboard() {
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/openehr-schema');
      const data = await response.json();
      
      if (data.success) {
        setSchemaData(data);
        console.log('OpenEHR Schema loaded:', data);
      } else {
        setError(data.error || 'Failed to load schema');
      }
    } catch (err) {
      setError('Network error: ' + err);
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

  const viewTableDetails = (table: TableDetail) => {
    setSelectedTable(table);
  };

  const filteredTables = schemaData?.tables?.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.schema.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const exportSchema = () => {
    if (!schemaData) return;
    
    const schemaText = JSON.stringify(schemaData, null, 2);
    const blob = new Blob([schemaText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openehr-schema.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading OpenEHR Schema...</h2>
          <p className="text-gray-600 mt-2">Connecting to Neon database and analyzing structure</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Schema</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadSchema}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">OpenEHR Schema Explorer</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSchema}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={exportSchema}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={16} />
              Export JSON
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-900">{schemaData?.database}</p>
              <p className="text-sm text-blue-700">Database</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{schemaData?.total_tables}</p>
              <p className="text-sm text-blue-700">Total Tables</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{filteredTables.length}</p>
              <p className="text-sm text-blue-700">Filtered Results</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search tables by name or schema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tables List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Table size={20} />
              Tables ({filteredTables.length})
            </h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {filteredTables.map((table) => (
              <div key={`${table.schema}.${table.name}`} className="border-b border-gray-100">
                <div
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleTableExpansion(`${table.schema}.${table.name}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">{table.name}</p>
                        <p className="text-sm text-gray-500">{table.schema} • {table.columns.length} columns</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {table.primary_key.length > 0 && (
                        <Key size={16} className="text-yellow-500" />
                      )}
                      {table.foreign_keys.length > 0 && (
                        <Link size={16} className="text-green-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewTableDetails(table);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Table Info */}
                {expandedTables.has(`${table.schema}.${table.name}`) && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-2">Columns ({table.columns.length}):</p>
                      <div className="space-y-1">
                        {table.columns.slice(0, 5).map((column) => (
                          <div key={column.column_name} className="flex justify-between text-xs">
                            <span className="font-mono">{column.column_name}</span>
                            <span className="text-gray-500">{column.data_type}</span>
                          </div>
                        ))}
                        {table.columns.length > 5 && (
                          <p className="text-xs text-gray-500 italic">...and {table.columns.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Table Details */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Table Details</h2>
          </div>
          {selectedTable ? (
            <div className="p-4 max-h-[600px] overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedTable.name}</h3>
                <p className="text-sm text-gray-500">{selectedTable.schema} • {selectedTable.type}</p>
              </div>

              {/* Columns */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Columns ({selectedTable.columns.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">Column</th>
                        <th className="px-2 py-1 text-left">Type</th>
                        <th className="px-2 py-1 text-left">Nullable</th>
                        <th className="px-2 py-1 text-left">Default</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedTable.columns.map((column) => (
                        <tr key={column.column_name} className="hover:bg-gray-50">
                          <td className="px-2 py-1 font-mono text-xs">{column.column_name}</td>
                          <td className="px-2 py-1 text-xs">{column.data_type}</td>
                          <td className="px-2 py-1 text-xs">
                            <span className={`px-1 rounded text-xs ${
                              column.is_nullable === 'YES' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {column.is_nullable}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-xs text-gray-500">{column.column_default || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Keys */}
              {selectedTable.primary_key.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Key size={16} className="text-yellow-500" />
                    Primary Key
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTable.primary_key.map((pk) => (
                      <span key={pk} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                        {pk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTable.foreign_keys.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Link size={16} className="text-green-500" />
                    Foreign Keys
                  </h4>
                  <div className="space-y-1">
                    {selectedTable.foreign_keys.map((fk, index) => (
                      <div key={index} className="text-xs bg-green-50 p-2 rounded">
                        <span className="font-mono">{fk.column_name}</span>
                        <span className="text-gray-500"> → </span>
                        <span className="font-mono">{fk.foreign_table_name}.{fk.foreign_column_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Records */}
              {selectedTable.sample_records.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Sample Records ({selectedTable.record_count})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {selectedTable.columns.map((col) => (
                            <th key={col.column_name} className="px-2 py-1 text-left font-mono">
                              {col.column_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedTable.sample_records.map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {selectedTable.columns.map((col) => (
                              <td key={col.column_name} className="px-2 py-1 text-xs">
                                {record[col.column_name] === null ? 'NULL' : String(record[col.column_name])}
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
            <div className="p-8 text-center text-gray-500">
              <Table size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Select a table to view its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
